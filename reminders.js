const { EmbedBuilder } = require("discord.js");
const { Cron } = require("croner");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
    /**
     * Starts a cron job to notify a user about something
     *
     * @param {Object} channel The channel to send messages in
     * @param {number} time UNIX timestamp
     * @param {string} type Type of notification
     * @param {string} message Message for the notification
     * @param {string} user The user to ping (their ID)
     */
    startTimer: (channel, time, type, message, user) => {
        // Make sure notif channel is defined
        if (!channel) {
            throw "Invalid notification channel! Please set a notification channel with /setnotifchannel";
        }

        // Define cron task for a certain time
        Cron(
            dayjs(time).tz("America/Chicago").toISOString(),
            { timezone: "America/Chicago" },
            () => {
                // Create embed
                const embed = new EmbedBuilder()
                    .setColor(0xe0b5f5)
                    .setTitle(`Notif (${type})`)
                    .setDescription(message)
                    .setTimestamp();

                channel.send({ content: `<@${user}>`, embeds: [embed] });
            }
        );
    },

    /**
     * Cleans up the pending notifications list from settings
     *
     * @param {Object} settings The settings object
     */
    cleanNotifs: (settings) => {
        settings.notifs = settings.notifs.filter((notif) =>
            dayjs(notif.time).isAfter(dayjs())
        );
    },

    /**
     * Starts timers for all rent reminders
     *  
     * @param {Object[]} rents List of rent objects
     */
    loadRentNotifs: (rents) => {
        // Iterate through all rents and set notification for the month
    }
};
