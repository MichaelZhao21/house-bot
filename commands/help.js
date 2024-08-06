const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("house-help")
        .setDescription(
            "Shows a list of all public commands avaliable for the bot!"
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        // List of commands
        const commands = [
            {
                name: "/house-help",
                value: "Shows this help dialog",
            },
            {
                name: "/admin-showpeople",
                value: "Shows the list of people in the house",
            },
            {
                name: "/notifs-showallnotifs",
                value: "Shows all notifications set for individual people",
            },
            {
                name: "/notifs-remindme",
                value: "Send a reminder to yourself at a specified date/time",
            },
            {
                name: "/chores-showchores",
                value: "Shows the list of chores for the current week",
            },
            {
                name: "/chores-finishchore",
                value: "Set a chore to complete",
            },
        ];
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xe0b5f5)
            .setTitle("Commands for House Bot!")
            .setThumbnail(
                "https://as1.ftcdn.net/v2/jpg/05/74/72/86/1000_F_574728684_voyDBkCWq2cKEd3MDoNE0nQLrWYFVxFh.jpg"
            )
            .addFields(commands)
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },
};
