const { EmbedBuilder } = require("discord.js");
const { Cron } = require("croner");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const objectSupport = require("dayjs/plugin/objectSupport");
const { getDocs, collection } = require("firebase/firestore");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

// Global list to store all alarms
let taskList = [];

/**
 * Creates a message object.
 *
 * @param {string} title Title of the notification
 * @param {string} subtitle Subtitle of the notification
 * @param {number} color Color of the embed
 */
function newMessage(title, subtitle, color) {
    return { title, subtitle, color };
}

/**
 * Sends a notification into a discord channel with the given message.
 *
 * @param {Object} channel Discord channel to send message in
 * @param {string} user User ID or "everyone" to ping
 * @param {Object} message Message object
 */
async function sendNotif(channel, user, message) {
    // Exception to ping everyone
    const userOut = user === "everyone" ? "@everyone" : `<@${user}>`;

    // Create embed
    const embed = new EmbedBuilder()
        .setColor(message.color)
        .setTitle(message.title)
        .setDescription(message.subtitle);

    const msg = await channel.send({
        content: `${userOut} ${message.title}`,
        embeds: [embed],
    });
    
    return msg;
}

/**
 * Creates a repeating task that will happen at each given timestamp until
 * no more timestamps are left. Note that if timestamps are not in order
 * this will break as it will not be able to run a task in the past.
 *
 * @param {number[]} times UNIX timestamp
 * @param {Function} func Function to run on each iteration
 * @param {string} id ID of this repeating cron task
 * @param {number} iter Current iteration, used to get times[iter] and passed into function
 */
function setRepeatTask(times, func, id, iter) {
    // Define cron task for a certain time
    const task = Cron(
        dayjs(times[iter]).tz("America/Chicago").toISOString(),
        { timezone: "America/Chicago", name: `${id}-${iter}` },
        async () => {
            // Call function
            await func(iter);

            // Stop if iterations are up
            if (iter + 1 >= times.length) {
                return;
            }

            // Otherwise, we keep going!
            setRepeatTask(times, func, id, iter + 1);
        }
    );
    saveTask(task);
}

/**
 * Runs a task at a specific time
 *
 * @param {number[]} time UNIX timestamp
 * @param {Function} func Function to run on each iteration
 * @param {string} id ID of this repeating cron task
 * @param {number} iter Current iteration, used to get times[iter] and passed into function
 */
function setTask(time, func, id, iter) {
    const tasak = Cron(
        dayjs(time).tz("America/Chicago").toISOString(),
        { timezone: "America/Chicago", name: `${id}-${iter}` },
        async () => {
            // Call function
            await func(iter);
        }
    );
    saveTask(tasak);
}

/**
 * Add a task to the task list
 *
 * @param {Cron} task
 */
function saveTask(task) {
    taskList.push(task);
}

/**
 * Clear all tasks with the given prefix
 *
 * @param {string} prefix
 */
function clearTasks(prefix) {
    const newTaskList = [];
    taskList.forEach((t) => {
        if (t.name.indexOf(prefix) === 0) {
            t.stop();
        } else {
            newTaskList.push(t);
        }
    });

    taskList = newTaskList;
}

/**
 * Cron task that runs at 3:30 am every night
 * that will clean up the task list
 */
function cleanTaskListTask() {
    const task = Cron(
        "30 3 * * *",
        { timezone: "America/Chicago", name: "cleaner" },
        () => {
            // Keep if it has a pattern (repeated task) or if it hasn't run yet
            taskList = taskList.filter(
                (t) =>
                    t.getPattern() !== undefined ||
                    t.previousRun() === undefined
            );
        }
    );
    saveTask(task);
}

/**
 * Literally stops ALL running tasks
 */
function stopAllTasks() {
    taskList.forEach((t) => t.stop());
}

module.exports = {
    newMessage,
    sendNotif,
    setRepeatTask,
    saveTask,
    clearTasks,
    cleanTaskListTask,
    stopAllTasks,
    setTask,
};
