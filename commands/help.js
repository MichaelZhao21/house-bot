const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
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
                name: "/help",
                value: "Shows this help dialog",
            },
            {
                name: "/people",
                value: "Shows the list of people in the house and their info",
            },
            {
                name: "/rent",
                value: "Shows the rent that you still owe for the month",
            },
            {
                name: "/chores",
                value: "Shows the chores you have for the week",
            },
            {
                name: "/finish",
                value: "Sets a specific chore to 'done', can also set a chore to not done",
            },
            {
                name: "/trash",
                value: "Notifies the next person to take out the trash, will rotate",
            },
            {
                name: "/recycling",
                value: "Notifies the next person to take out the recycling, will rotate",
            },
            {
                name: "/events",
                value: "Shows all future events",
            },
            {
                name: "/addevent",
                value: "Add an event, will remind people 1 hr before, 10 mins before, and on the dot",
            },
        ];
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xe0b5f5)
            .setTitle("Commands for House Bot!")
            .setDescription(
                "These are all the commands that can be used. Admin commands are not listed and prefixed with 'admin'."
            )
            .setThumbnail(
                "https://as1.ftcdn.net/v2/jpg/05/74/72/86/1000_F_574728684_voyDBkCWq2cKEd3MDoNE0nQLrWYFVxFh.jpg"
            )
            .addFields(commands);

        interaction.reply({ embeds: [embed] });
    },
};
