const { EmbedBuilder } = require("discord.js");
const { Cron } = require("croner");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const objectSupport = require("dayjs/plugin/objectSupport");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

// Global list of all tasks
const taskStore = {
    choreRepeater: null,
    rentRepeater: null,
    cleaner: null,
    rent: {}, // List of users, each one with an array
    chores: {}, // List of users, each one with an array
    events: [], // List of event notifications
};
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
 * Runs a task at a specific time
 *
 * @param {number[]} time UNIX timestamp
 * @param {Function} func Function to run on each iteration
 * @param {string} category Category used
 * @param {string} secondary Secondary used
 */
function setTask(time, func, category, secondary) {
    const task = Cron(
        dayjs(time).tz("America/Chicago").toISOString(),
        { timezone: "America/Chicago" },
        async () => {
            // Call function
            await func(iter);
        }
    );
    saveTask(task, category, secondary);
}

/**
 * Add a task to the task list
 *
 * @param {Cron} task
 * @param {string} category Category used
 * @param {string} secondary Secondary used
 */
function saveTask(task, category, secondary) {
    switch (category) {
        case "chore-repeater":
            taskStore.choreRepeater = task;
            break;
        case "rent-repeater":
            taskStore.rentRepeater = task;
            break;
        case "cleaner":
            taskStore.cleaner = task;
            break;
        case "events":
            taskStore.events.push(task);
            break;
        default:
            if (category !== "rent" && category !== "chores") throw new Error("Invalid category passed into saveTask: " + category);

            if (!taskStore[category][secondary]) taskStore[category][secondary] = [];
            taskStore[category][secondary].push(task);
            break;
    }
}

/**
 * Clear all tasks in a category
 *
 * @param {string} category
 * @param {string} secondary
 */
function clearTasks(category, secondary) {
    // If nothing defined:
    if (!category && !secondary) {
        // Stop all tasks
        if (taskStore.choreRepeater) taskStore.choreRepeater.stop();
        if (taskStore.rentRepeater) taskStore.rentRepeater.stop();
        Object.values(taskStore.chores).forEach(c => c.forEach(cv => cv.stop()));
        Object.values(taskStore.rent).forEach(r => r.forEach(rv => rv.stop()));
        Object.values(taskStore.events).forEach(e => e.stop());

        // Remove all tasks
        taskStore.choreRepeater = null;
        taskStore.rentRepeater = null;
        taskStore.chores = {};
        taskStore.rent = {};
        taskStore.events = [];

        return;
    }

    // If secondary not defined, clear all of one:
    if (!secondary) {
        switch (category) {
            case "rent":
                Object.values(taskStore.rent).forEach(r => r.forEach(rv => rv.stop()));
                taskStore.rent = {};
                break;
            case "chores":
                Object.values(taskStore.chores).forEach(c => c.forEach(cv => cv.stop()));
                taskStore.chores = {};
                break;
            case "events":
                Object.values(taskStore.events).forEach(e => e.stop());
                taskStore.events = [];
                break;
            default:
                throw new Error("Invalid category passed ot clearTasks: " + category);
                break;
        }

        return;
    }

    // Make sure that secondary only defined for rent/chores
    if (category !== "rent" && category !== "chores") throw new Error("Category can only be passed with secondary if it is 'rent' or 'chores': " + category);

    // Clear things
    if (taskStore[category][secondary])
        taskStore[category][secondary].forEach(c => c.stop());
    taskStore[category][secondary] = [];
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
    saveTask(task, "cleaner");
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
    saveTask,
    clearTasks,
    cleanTaskListTask,
    stopAllTasks,
    setTask,
};
