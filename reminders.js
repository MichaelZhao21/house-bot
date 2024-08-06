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
                                } ${subtext} (${month + 1}/${time.date()}/${year})`
                            )

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
