const {
    Firestore,
    getDocs,
    collection,
    writeBatch,
} = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const { setAlarm, newMessage } = require("./notifications");

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
    /**
     * Cleans up events that have happened in the past
     * and returns the list of cleaned events
     *
     * @param {Firestore} db The database object
     */
    cleanAndGetEvents: async function cleanAndGetEvents(db) {
        const now = dayjs().tz("America/Chicago");

        // Split events into past and future events
        const toRemove = [];
        const nextEvents = [];
        (await getDocs(collection(db, "events"))).forEach((d) => {
            const e = d.data();
            if (dayjs(e.time).tz("America/Chicago", true).isBefore(now)) {
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
    },

    /**
     * Sets an alarm for an event
     *
     * @param {Object} event Event object
     */
    setEventAlarm: function setEventAlarm(event, channel) {
        setAlarm(
            channel,
            "everyone",
            event.time,
            newMessage(event.title, event.subtitle, 0xe0b5f5)
        );
    },
};
