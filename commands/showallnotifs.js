const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const objectSupport = require("dayjs/plugin/objectSupport");
const advancedFormat = require("dayjs/plugin/advancedFormat");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);
dayjs.extend(advancedFormat);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("notifs-showallnotifs")
        .setDescription(
            "Shows all notifications that are currently set for the future"
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const userMap = interaction.guild.members.cache;

        const embed = new EmbedBuilder()
            .setTitle("All Pending Notifications")
            .setDescription(
                "List of all notifications/reminders for the future."
            )
            .addFields(
                settings.notifs
                    .sort((a, b) => a.time - b.time)
                    .map((notif) => ({
                        name: `${userMap.get(notif.user).nickname} (${
                            userMap.get(notif.user).user.username
                        }) - ${notif.type}`,
                        value: dayjs(notif.time)
                            .tz("America/Chicago")
                            .format("MMM Do, YYYY @ h:mm a z"),
                    }))
            );

        interaction.reply({ embeds: [embed] });
    },
};
