const { setChoreNotifs, startChoreSystem } = require("./chores");
const { cleanAndGetEvents, setEventAlarm } = require("./events");
const { stopAllTasks, cleanTaskListTask } = require("./notifications");
const { setRentNotifs } = require("./rent");

/**
 * Restarts all tasks accordingly
 *
 * @param {Object} guild The guild to use
 * @param {Firestore} db Database object
 * @param {Object} settings Settings object
 */
async function reloadAllTasks(guild, db, settings) {
    // Stop all active tasks
    stopAllTasks();

    // If notifChannel not set, return
    if (!settings.notifChannel) {
        console.log("Notification channel not set, won't start tasks");
        return;
    }

    // Get the main notif channel
    const channel = await guild.channels.fetch(settings.notifChannel);

    // Start the events timers
    const events = await cleanAndGetEvents(db);
    events.forEach((event) => setEventAlarm(event, channel));

    // Start rent notification cron task
    setRentNotifs(guild, db, settings);

    // Start the chore notification cron task
    setChoreNotifs(guild, db, settings);
    startChoreSystem(guild, db, settings);

    // Start task list cleanup task
    cleanTaskListTask();
}

module.exports = { reloadAllTasks };
