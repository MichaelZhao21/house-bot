const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("notifications")
        .setDescription("Shows all your upcoming notifications")
        .addBooleanOption((option) =>
            option
                .setName("showall")
                .setDescription("Set true to show all of your notifications")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const showAll = interaction.options.getBoolean("showall");

        // Get user's doc
        let personRef = await getDoc(doc(db, "people", interaction.user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house do not have chores assigned!"
            );
            return;
        }
        let user = personRef.data();

        const now = dayjs().tz("America/Chicago").minute(0).second(0);

        const setNotifs = [
            { time: now.date(20).hour(7), reason: "Rent Reminder" },
            { time: now.date(25).hour(7), reason: "Rent Second Reminder" },
            { time: now.date(25).hour(20), reason: "Rent Last Reminder" },
            { time: now.date(26).hour(0), reason: "Rent Late" },
            { time: now.day(1).hour(7), reason: "Chores Assigned" },
            { time: now.add(1, "week").day(0).hour(21), reason: "Chores Late" },
        ];

        const userNotifs = user.choreNotifs.map((c) => {
            const split = c.split("-");
            const day = Number(split[0]);
            return {
                time: dayjs(split[1], "HH:mm")
                    .tz("America/Chicago", true)
                    .day(day)
                    .add(day === 0 ? 1 : 0, "weeks"),
                reason: "Custom Chore Reminder",
            };
        });

        const notifs = [...setNotifs, ...userNotifs];
        const fsNotifs = notifs
            .filter((d) => d.time.isAfter(now))
            .sort((a, b) => a.time.diff(b.time));

        // If show all
        if (showAll) {
            const un =
                userNotifs.length === 0
                    ? "[none]"
                    : userNotifs
                          .map((n) => `- ${n.time.format("dddd h:mm a")}`)
                          .join("\n");
            const embed = new EmbedBuilder()
                .setColor(0xaf99ff)
                .setTitle("All your notifications")
                .setDescription(
                    "List of all your notifications and automatically set notifications"
                )
                .setFields([
                    {
                        name: "Manually set chore notifications",
                        value: un,
                    },
                    {
                        name: "Automatically set notifications",
                        value: setNotifs
                            .map(
                                (n) =>
                                    `- **${n.reason}**: ${n.time.format(
                                        "dddd MMM Do, YYYY @ h:mm a z"
                                    )}`
                            )
                            .join("\n"),
                    },
                ]);
            interaction.reply({ embeds: [embed] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xaf99ff)
            .setTitle("Your upcoming notifications")
            .setDescription(
                "Note that notifications are recreated each week/month for chores/rent"
            )
            .setFields(
                fsNotifs.map((n) => ({
                    name: n.reason,
                    value: n.time.format("dddd MMM Do, YYYY @ h:mm a z"),
                }))
            );
        interaction.reply({ embeds: [embed] });
    },
};
