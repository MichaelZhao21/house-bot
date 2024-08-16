const { Cron } = require("croner");
const {
    Firestore,
    getDocs,
    collection,
    getDoc,
    doc,
    writeBatch,
    setDoc,
} = require("firebase/firestore");
const {
    newMessage,
    sendNotif,
    setRepeatTask,
    saveTask,
    clearTasks,
} = require("./notifications");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const objectSupport = require("dayjs/plugin/objectSupport");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(objectSupport);

/**
 * Sets up a cron task to assign chores and
 * create notifications for chores
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 */
async function startChoreSystem(guild, db, settings) {
    // Set up this week's notifications
    await setChoreNotifs(guild, db, settings);

    // Create cron task that will get all users and set chore notifications for them
    // This will occur at 7am on Monday each week
    const task = Cron(
        "0 7 * * 1",
        { timezone: "America/Chicago", name: "chore-repeater" },
        assignChoresAndNotifs.bind(this, guild, db, settings)
    );
    saveTask(task);
}

const seasonalMonths = [0, 3, 6, 9];

/**
 * Assigns chores for the current week. Also will call setChoreNotifs.
 *
 * Weekly - every week
 * Biweekly - ODD weeks
 * Monthly - first week of the month (day <= 7)
 * Seasonally - first week of October, January, April, July - BOT WILL NOT ASSIGN BUT JUST REMIND
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 */
async function assignChoresAndNotifs(guild, db, settings) {
    // Get all users
    const usersRef = await getDocs(collection(db, "people"));
    const users = usersRef.docs.map((u) => ({ id: u.id, ...u.data() }));
    const total = usersRef.size;
    const t13 = Math.floor(total / 3);
    const t23 = Math.floor((total * 2) / 3);

    // If no chores exist, ignore
    if (!settings.chores) {
        return;
    }

    // Get chores
    const weekly = settings.chores.weekly ?? [];
    const biweekly = settings.chores.biweekly ?? [];
    const monthly = settings.chores.monthly ?? [];

    // Set week count
    if (!settings.weekCount) {
        settings.weekCount = 0;
    }

    // Assign weekly, biweekly, and monthly chores
    const choreAss = Array.from({ length: total }, () => []);
    weekly.forEach((c, i) => {
        choreAss[i % total].push(c);
    });
    if (settings.weekCount % 2 === 1) {
        biweekly.forEach((c, i) => {
            choreAss[(i + t13) % total].push(c);
        });
    }
    if (dayjs().date() <= 7) {
        monthly.forEach((c, i) => {
            choreAss[(i + t23) % total].push(c);
        });
    }

    // Assign to all users
    // Also split all people that are/aren't on vacation
    const currMon = dayjs().day(1).format("MM-DD-YYYY");
    const vacay = [];
    const remaining = [];
    users.forEach((u) => {
        // Assign chore
        const number = (u.number + settings.weekCount) % total;
        u.chores.push(...choreAss[number]);

        // Clean choresDone array
        u.choresDone = [];

        // Split vacay or not
        if (u.vacations.indexOf(currMon) !== -1) {
            vacay.push(u);
        } else {
            remaining.push(u);
        }
    });

    // Figure out which chores are for ppl on vacation
    const openChores = [];
    vacay.forEach((u) => {
        openChores.push(...u.chores), (u.chores = []);
    });

    // Loop through openChores until empty and give to people who have done the least number of extra chores
    openChores.forEach((c) => {
        const min = Math.min(...remaining.map((u) => u.extraChores ?? 0));
        for (let i = 0; i < remaining.length; i++) {
            if (!remaining[i].extraChores) remaining[i].extraChores = 0;
            if (remaining[i].extraChores === min) {
                remaining[i].chores.push(c);
                remaining[i].extraChores++;
                break;
            }
        }
    });

    // Update all user docs
    const batch = writeBatch(db);
    users.forEach((u) => {
        const { id, ...noId } = u;
        batch.set(doc(db, "people", id), noId);
    });

    // Also update week count for settings
    settings.weekCount += 1;
    batch.set(doc(db, "settings", "0"), settings);

    await batch.commit();

    // Send notification about chores for each user who is remaining
    remaining.forEach(async (u) => {
        const message = newMessage(
            `You have ${u.chores.length} chores this week`,
            "Here are your chores:\n" +
                u.chores
                    .map((c) => `- ${settings.chores.nameMap[c]} [${c}]`)
                    .join("\n"),
            0x91d5ff,
            `chore-info-${u.id}`
        );

        // Get the user notif channel
        const channel = await guild.channels.fetch(u.notifChannel);

        sendNotif(channel, u.id, message);
    });

    // Send notification about seasonal chore if applicable
    if (
        dayjs().date() <= 7 &&
        seasonalMonths.indexOf(dayjs().month()) !== -1 &&
        settings.chores.seasonally &&
        settings.chores.seasonally.length !== 0
    ) {
        const channel = await guild.channels.fetch(settings.notifChannel);
        sendNotif(
            channel,
            "everyone",
            newMessage(
                "It's time for seasonal chores!",
                "Please assign the following chores:\n" +
                    settings.chores.seasonally
                        .map((c) => `- ${settings.chores.nameMap[c]} [${c}]`)
                        .join("\n"),
                0x91d5ff,
                `chore-seasonal`
            )
        );
    }

    return setChoreNotifs(guild, db, settings);
}

/**
 * Sets the notifications for chores
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 */
async function setChoreNotifs(guild, db, settings) {
    // TODO: Make async promise.all
    (await getDocs(collection(db, "people"))).forEach(async (d) => {
        const user = d.data();

        // Create a list of times
        const times = user.choreNotifs
            ? user.choreNotifs.map((n) => {
                  const split = n.split("-");
                  const day = Number(split[0]);
                  return dayjs(split[1], "HH:mm").day(day);
              })
            : [];

        // Create a list of messages
        const message = newMessage(
            "Do your chores!",
            "This is a reminder to do your chores:\n",
            0xa3f1ff,
            `chore-notif-${d.id}-`
        );

        // Add late reminder for due date
        times.push(dayjs().add(1, "week").day(0).hour(21).minute(0));
        const lateMessage = newMessage(
            "YOUR CHORES ARE **LATE**!!",
            "Please do your chores ASAP. You have been given 1 strike:\n",
            0xc90076,
            `chore-notif-${d.id}-late`
        );

        // Get the user notif channel
        const channel = await guild.channels.fetch(user.notifChannel);

        // Create alarm for the event
        const notifAlarm = async (iter) => {
            // Get user
            const user = (await getDoc(doc(db, "people", d.id))).data();
            if (!user.paid) {
                user.paid = {};
            }

            // No need to remind if user has finished all chores
            if (user.chores.length === 0) {
                return;
            }

            // If late, send late notif
            if (iter + 1 === times.length) {
                // Give strike
                user.strikes += 1;
                await setDoc(doc(db, "people", d.id), user);

                lateMessage.subtitle += user.chores
                    .map((c) => `- ${settings.chores.nameMap[c]} [${c}]`)
                    .join("\n");
                sendNotif(channel, d.id, lateMessage);
                return;
            }

            // Send notification
            const cm = structuredClone(message);
            cm.subtitle += user.chores
                .map((c) => `- ${settings.chores.nameMap[c]} [${c}]`)
                .join("\n");
            cm.id += iter;
            sendNotif(channel, d.id, cm);
        };

        // Set the repeating task!
        setRepeatTask(times, notifAlarm, `chore-notif-${d.id}-repeat`, 0);
    });
}

async function deleteChoreNotifs() {
    return clearTasks("chore-notif");
}

module.exports = {
    startChoreSystem,
    assignChoresAndNotifs,
    setChoreNotifs,
    deleteChoreNotifs,
};
