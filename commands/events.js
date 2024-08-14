const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const advancedFormat = require("dayjs/plugin/advancedFormat");
const { cleanAndGetEvents } = require("../src/events");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("events")
        .setDescription(
            "Shows all events that are currently set for the future"
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        // Get all events
        const events = await cleanAndGetEvents(db);

        const embed = new EmbedBuilder()
            .setTitle("All Future Events")
            .setDescription("List of all events for the future.")
            .setThumbnail(
                "https://www.shutterstock.com/shutterstock/photos/2348753395/display_1500/stock-vector-cute-cartoon-january-calendar-clipart-page-for-kids-vector-illustration-for-children-vector-2348753395.jpg"
            )
            .setColor(0xd67ce6)
            .addFields(
                events.map((e) => ({
                    name: `${e.title} (${e.id})`,
                    value: dayjs(e.time)
                        .tz("America/Chicago")
                        .format("MMM Do, YYYY @ h:mm a z"),
                }))
            );

        interaction.reply({ embeds: [embed] });
    },
};
