const {
    Firestore,
    getDocs,
    collection,
    writeBatch,
} = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const {
    sendNotif,
    newMessage,
    setTask,
    clearTasks,
} = require("./notifications");

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Cleans up events that have happened in the past
 * and returns the list of cleaned events
 *
 * @param {Firestore} db The database object
 */
async function cleanAndGetEvents(db) {
    const now = dayjs().tz("America/Chicago");

    // Split events into past and future events
    const toRemove = [];
    const nextEvents = [];
    (await getDocs(collection(db, "events"))).forEach((d) => {
        const e = d.data();
        if (dayjs(e.time).tz("America/Chicago").isBefore(now)) {
            toRemove.push(d.ref);
        } else {
            nextEvents.push({ id: d.id, ...e });
        }
    });

    // Remove all past events
    const batch = writeBatch(db);
    toRemove.forEach((r) => batch.delete(r));
    await batch.commit();

    return nextEvents;
}

/**
 * Sets an alarm for an event
 *
 * @param {Object} event Event object, with an ID
 */
function setEventAlarm(event, channel) {
    clearTasks("events");

    // Create list of times
    const times = [];
    const now = dayjs().tz("America/Chicago");
    const eventTime = dayjs(event.time).tz("America/Chicago");
    times.push(eventTime.subtract(60, "minutes"));
    times.push(eventTime.subtract(10, "minutes"));
    times.push(eventTime);

    // Create list of messages
    const time = eventTime.format("h:mm a");
    const messages = [];
    messages.push(
        newMessage(
            `Event in 1 hour: **${event.title}** (${time})`,
            event.subtitle,
            0xfbfc9f
        )
    );
    messages.push(
        newMessage(
            `Event in 10 mins: **${event.title}** (${time})`,
            event.subtitle,
            0xffb330
        )
    );
    messages.push(
        newMessage(
            `Event NOW: **${event.title}** (${time})`,
            event.subtitle,
            0xff3636
        )
    );

    // Create alarm for the event
    const eventAlarm = (iter) => {
        sendNotif(channel, "everyone", messages[iter]);
    };

    // Set the repeating task!
    times.forEach((t, i) => {
        setTask(t, eventAlarm.bind(this, i), "events", event.id);
    });
}

module.exports = {
    cleanAndGetEvents,
    setEventAlarm,
};
