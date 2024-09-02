const { Cron } = require("croner");
const {
    Firestore,
    getDocs,
    collection,
    getDoc,
    doc,
    setDoc,
} = require("firebase/firestore");
const { newMessage, sendNotif, saveTask, setTask, clearTasks } = require("./notifications");
const dayjs = require("dayjs");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(timezone);
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
    await deleteRentNotifs();

    // Get all users
    (await getDocs(collection(db, "people"))).forEach((d) => {
        setOneRentNotif(guild, db, settings, d);
    });
}

/**
 * Sets the notifications for rent for ONE person
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Firestore database instance
 * @param {Object} settings Settings object
 * @param {QueryDocumentSnapshot<DocumentData, DocumentData>} d User doc
 */
async function setOneRentNotif(guild, db, settings, d) {
    const user = d.data();

    // Create a list of times
    const times = [];
    const now = dayjs().tz("America/Chicago").minute(0).second(0);
    times.push(now.date(20).hour(7));
    times.push(now.date(25).hour(7));
    times.push(now.date(25).hour(20));
    times.push(now.date(26).hour(0));

    // Create a list of messages
    const totalRent = user.rent + settings.utilities;
    const subtitle = `You owe a total of $${totalRent} for this month.`;
    const messages = [
        newMessage("Rent due in **5 days**!", subtitle, 0x9fe3b4),
        newMessage("Rent due **TODAY**!", subtitle, 0xff8000),
        newMessage("Rent due **IMMEDIATELY**", subtitle, 0xff390d),
        newMessage(
            "Rent is **LATE**",
            subtitle + " Which is now late. You will be given a strike.",
            0xbf0254
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
        const neow = dayjs().tz("America/Chicago").format("MM-YYYY");
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
    times.forEach((t, i) => {
        setTask(t, rentAlarm.bind(this, i), `rent-notif-${d.id}`, i);
    });
}

async function deleteRentNotifs() {
    return clearTasks("rent-notif");
}

module.exports = {
    setRentNotifs,
};
