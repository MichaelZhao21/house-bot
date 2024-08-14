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
const alarmList = [];

/**
 * Creates a message object.
 *
 * @param {string} title Title of the notification
 * @param {string} subtitle Subtitle of the notification
 * @param {number} color Color of the embed
 * @param {string} id ID of the message
 */
function newMessage(title, subtitle, color, id) {
    return { title, subtitle, color, id };
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
        .setDescription(message.subtitle)

    channel.send({
        content: `${userOut} ${message.title}`,
        embeds: [embed],
    });
}

/**
 * Starts a cron job to notify a user about something
 *
 * @param {Object} channel Discord channel to send message in
 * @param {string} user User ID or "everyone" to ping
 * @param {number} time UNIX timestamp
 * @param {Object} message Message object
 */
function setAlarm(channel, user, time, message) {
    // Define cron task for a certain time
    const task = Cron(
        dayjs(time).tz("America/Chicago").toISOString(),
        {
            timezone: "America/Chicago",
            name: message.id,
        },
        sendNotif.bind(this, channel, user, message)
    );
    alarmList.push(task);
}

/**
 * Creates a repeating task that will happen at each given timestamp until
 * no more timestamps are left. Note that if timestamps are not in order
 * this will break as it will not be able to run a task in the past.
 *
 * @param {number[]} times UNIX timestamp
 * @param {Function} func Function to run on each iteration
 * @param {number} iter Current iteration, used to get times[iter] and passed into function
 */
function setRepeatTask(times, func, iter) {
    // Define cron task for a certain time
    Cron(
        dayjs(times[iter]).tz("America/Chicago").toISOString(),
        { timezone: "America/Chicago" },
        async () => {
            // Call function
            await func(iter);

            // Stop if iterations are up
            if (iter + 1 >= times.length) {
                return;
            }

            console.log("CONTINUING!!!")

            // Otherwise, we keep going!
            setRepeatTask(times, func, iter + 1);
        }
    );
}

module.exports = {
    newMessage,
    sendNotif,
    setAlarm,
    setRepeatTask,

    // TODO: Refactor into rent.js for rent calculations and stuff

    /**
     * Starts the rent timer
     *
     * @param {Firestore} db
     * @param {number} month range between 0-11
     * @param {number} year
     * @param {boolean} firstTimer
     * @param {Object} settings
     * @param {Object} channel The channel to send messages in
     */
    startRentTimer: function startRentTimer(
        db,
        month,
        year,
        firstTimer,
        settings,
        channel
    ) {
        // Make sure notif channel is defined
        if (!channel) {
            throw "Invalid notification channel! Please set a notification channel with /setnotifchannel";
        }

        // Determine which date to set timer to
        const date = firstTimer ? 25 : 28;
        const message = firstTimer ? "Due" : "LATE";
        const color = firstTimer ? 0xff997d : 0xff5959;
        const subtext = firstTimer
            ? "is due at the end of today for next month!"
            : "was due already for next month!";

        // Get dayjs time to set reminder for
        const time = dayjs({
            year: year,
            month: month,
            day: date,
            hour: 20,
            minute: 0,
            second: 0,
            millisecond: 0,
        });

        // Define cron task for a certain time
        Cron(
            time.tz("America/Chicago", true).toISOString(),
            { timezone: "America/Chicago" },
            async () => {
                // Loop through each user and only send rent to those that haven't paid yet
                (await getDocs(collection(db, "rent"))).forEach((d) => {
                    const user = d.data();
                    const id = d.id;

                    // Get current month
                    const now = dayjs({
                        year: year,
                        month: month,
                        day: 0,
                        hour: 0,
                        minute: 0,
                        second: 0,
                        millisecond: 0,
                    });
                    const payMonth = now.diff(
                        dayjs(settings.rentStart),
                        "months"
                    );
                    const total = user.rent + settings.utilities;

                    // Send if no pay
                    if (user.paid[payMonth] < total) {
                        // Create embed
                        const embed = new EmbedBuilder()
                            .setColor(color)
                            .setTitle(`Rent is ${message}!`)
                            .setDescription(
                                `Rent of amount $${
                                    total - user.paid[payMonth]
                                } ${subtext} (${
                                    month + 1
                                }/${time.date()}/${year})`
                            );

                        channel.send({
                            content: `<@${id}> Rent is ${message}!`,
                            embeds: [embed],
                        });
                    }
                });

                // Calculate next month/year
                if (!firstTimer) {
                    if (month === 11) {
                        month = 0;
                        year++;
                    } else {
                        month++;
                    }
                }

                // Start the next timer
                startRentTimer(db, month, year, !firstTimer, settings, channel);
            }
        );
    },
};
