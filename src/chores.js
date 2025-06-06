const { Cron } = require("croner");
const {
    Firestore,
    getDocs,
    collection,
    getDoc,
    doc,
    writeBatch,
    setDoc,
    QueryDocumentSnapshot,
    DocumentData,
} = require("firebase/firestore");
const {
    newMessage,
    sendNotif,
    saveTask,
    clearTasks,
    setTask,
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

// TEMP: Disable strike system here!! (set to false if you want to use it)
// Note that this will also clear the chores for all users at the end of each week
const DISABLE_STRIKES = true;

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
    saveTask(task, "chore-repeater");
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
    // Filter out duplicate sweep + mop on months + biweekly
    // TODO: extract hardcoded duplicate chores to setting
    const choreAss = Array.from({ length: total }, () => []);
    let filteredWeekly = weekly;
    if (dayjs().tz("America/Chicago").date() <= 7) {
        filteredWeekly = filteredWeekly.filter((w) => w !== "sweep" && w !== "mop");
        monthly.forEach((c, i) => {
            choreAss[(i + t23) % total].push(c);
        });
    }
    if (settings.weekCount % 2 === 1) {
        filteredWeekly = filteredWeekly.filter((w) => w !== "counter");
        biweekly.forEach((c, i) => {
            choreAss[(i + t13) % total].push(c);
        });
    }
    filteredWeekly.forEach((c, i) => {
        choreAss[i % total].push(c);
    });

    // Assign to all users
    // Also split all people that are/aren't on vacation
    const currMon = dayjs().tz("America/Chicago").day(1).format("MM-DD-YYYY");
    const vacay = [];
    const remaining = [];
    users.forEach((u) => {
        // Assign chore
        const number = (u.number + settings.weekCount) % total;
        if (DISABLE_STRIKES) {
            u.chores = choreAss[number];
        } else {
            u.chores.push(...choreAss[number]);
        }

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

    // Add tidy up chore to everyone
    remaining.forEach((r) => r.chores.push("tidy"));

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
            0x91d5ff
        );

        // Get the user notif channel
        const channel = await guild.channels.fetch(u.notifChannel);

        sendNotif(channel, u.id, message);
    });

    // Send notification about seasonal chore if applicable
    if (
        dayjs().tz("America/Chicago").date() <= 7 &&
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
                0x91d5ff
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
    await deleteChoreNotifs();

    // TODO: Make async promise.all
    (await getDocs(collection(db, "people"))).forEach((d) => {
        setOneChoreNotif(guild, db, settings, d);
    });
}

/**
 * Sets the notifications for chores for ONE person
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 * @param {QueryDocumentSnapshot<DocumentData, DocumentData>} d User doc
 */
async function setOneChoreNotif(guild, db, settings, d) {
    const user = d.data();

    // Delete the user's chore notifs
    clearTasks('chores', d.id);

    // Create a list of times
    const times = user.choreNotifs
        ? user.choreNotifs.map((n) => {
            const split = n.split("-");
            const day = Number(split[0]);

            // Return smth else if setting on sunday (special case lmao)
            if (dayjs().tz("America/Chicago").day() === 0) {
                return dayjs
                    .tz(split[1], "HH:mm", "America/Chicago")
                    .day(day)
                    .add(day === 0 ? 0 : -1, "weeks");
            }

            return dayjs
                .tz(split[1], "HH:mm", "America/Chicago")
                .day(day)
                .add(day === 0 ? 1 : 0, "weeks");
        })
        : [];

    // Create a list of messages
    const message = newMessage(
        "Do your chores!",
        "This is a reminder to do your chores:\n",
        0xa3f1ff
    );

    // Add late reminder for due date
    if (dayjs().tz("America/Chicago").day() === 0) {
        times.push(
            dayjs()
                .tz("America/Chicago")
                .day(0)
                .hour(23)
                .minute(59)
                .second(59)
                .millisecond(0)
        );
    } else {
        times.push(
            dayjs()
                .tz("America/Chicago")
                .add(1, "week")
                .day(0)
                .hour(23)
                .minute(59)
                .second(59)
                .millisecond(0)
        );
    }
    let lateMessage = newMessage(
        "YOUR CHORES ARE **LATE**!!",
        "Please do your chores ASAP. You have been given %STRIKES% strike:\n",
        0xc90076
    );
    if (DISABLE_STRIKES) {
        lateMessage = newMessage("Reminder to finish your chores!", "It is the end of the week, so here's a reminder to finish your chores. Please let the roommates know if you are unable to, and if you've done it already thank you! Here are the chores you have this week:\n", 0xffb5e0);
    }

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
        if (iter === times.length - 1) {
            // Give strikes for each chore not done
            if (!DISABLE_STRIKES && user.chores.length > 0) {
                user.strikes += user.chores.length;
                await setDoc(doc(db, "people", d.id), user);
                lateMessage.subtitle = lateMessage.subtitle.replace('%STRIKES%', user.chores.length);
            }

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
        sendNotif(channel, d.id, cm);
    };

    // Set the repeating task!
    times.forEach((t, i) => {
        setTask(t, notifAlarm.bind(this, i), "chores", d.id);
    });
}

async function deleteChoreNotifs() {
    return clearTasks("chores");
}

module.exports = {
    startChoreSystem,
    assignChoresAndNotifs,
    setChoreNotifs,
    setOneChoreNotif,
    deleteChoreNotifs,
};
