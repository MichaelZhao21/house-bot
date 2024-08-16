const { Cron } = require("croner");
const dayjs = require("dayjs");
const {
    Firestore,
    getDocs,
    collection,
    getDoc,
    doc,
    setDoc,
} = require("firebase/firestore");
const {
    newMessage,
    sendNotif,
    setRepeatTask,
    saveTask,
} = require("./notifications");

/**
 * Sets up a cron task to create notifications each
 * month for rent.
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 */
async function setRentNotifs(guild, db, settings) {
    // Set up this month's notifications
    await createRepeatingRentNotifs(guild, db, settings);

    // Create cron task that will get all users and set rent notifications for them
    // This will occur at 1:00 am on the first of each month
    const task = Cron(
        "0 1 1 * *",
        { timezone: "America/Chicago", name: "rent-repeater" },
        createRepeatingRentNotifs.bind(this, guild, db, settings)
    );
    saveTask(task);
}

/**
 * Create the repeating rent notification for the current month
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 */
async function createRepeatingRentNotifs(guild, db, settings) {
    // Get all users
    (await getDocs(collection(db, "people"))).forEach(async (d) => {
        const user = d.data();

        // Create a list of times
        const times = [];
        const now = dayjs().minute(0).second(0);
        if (now.date() < 20) times.push(now.date(20).hour(7));
        else if (now.date() < 25) {
            times.push(now.date(25).hour(7));
            times.push(now.date(25).hour(20));
            times.push(now.date(26).hour(0));
        }

        // Create a list of messages
        const totalRent = user.rent + settings.utilities;
        const subtitle = `You owe a total of $${totalRent} for this month.`;
        const messages = [
            newMessage(
                "Rent due in **5 days**!",
                subtitle,
                0x9fe3b4,
                `rent-${d.id}-5d`
            ),
            newMessage(
                "Rent due **TODAY**!",
                subtitle,
                0xff8000,
                `rent-${d.id}-1d`
            ),
            newMessage(
                "Rent due **IMMEDIATELY**",
                subtitle,
                0xff390d,
                `rent-${d.id}-4h`
            ),
            newMessage(
                "Rent is **LATE**",
                subtitle + " Which is now late. You will be given a strike.",
                0xbf0254,
                `rent-${d.id}`
            ),
        ];

        // Get the user notif channel
        const channel = await guild.channels.fetch(user.notifChannel);

        // Create alarm for the event
        const rentAlarm = async (iter) => {
            // Do nothing if rent is not being tracked!
            if (!settings.tracking) return;

            // Get user
            const user = (await getDoc(doc(db, "people", d.id))).data();
            if (!user.paid) {
                user.paid = {};
            }

            // No need to remind if user paid!
            const neow = dayjs().format("MM-YYYY");
            const total = user.rent + settings.utilities;
            if (user.paid[neow] >= total) return;

            // If rent is late (last notif), give strike
            if (iter + 1 === messages.length) {
                // Give strike
                user.strikes += 1;
                await setDoc(doc(db, "people", d.id), user);
            }

            // Otherwise remind user to pay
            sendNotif(channel, d.id, messages[iter]);
        };

        // Set the repeating task!
        setRepeatTask(times, rentAlarm, `rent-${d.id}-repeat`, 0);
    });
}

module.exports = {
    setRentNotifs,
};
