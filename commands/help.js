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
                value: "Shows the chores you have for the week. Can also list all chores for the house",
            },
            {
                name: "/setchorenotifs",
                value: "Set custom notifications for your chores -- will REPLACE the previously set notifications"
            },
            {
                name: "/addchorenotifs",
                value: "Adds custom notifications for your chores -- will KEEP the previously set notifications"
            },
            {
                name: "/finish",
                value: "Sets a specific chore to 'done', can also set a chore to not done",
            },
            {
                name: "/trade",
                value: "Trade chores with someone else",
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
            {
                name: "/vacation",
                value: "Sets you to be 'on vacation' for the upcoming week (you won't be assigned chores). Can also manually choose a week to set.",
            },
            {
                name: "/notifications",
                value: "Shows you your upcoming notifications or all your set notifications",
            },
        ];
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xe0b5f5)
            .setTitle("Commands for House Bot!")
            .setDescription(
                "These are all the commands that can be used. Admin commands are not listed and prefixed with 'admin'."
            )
            .addFields(commands);

        interaction.reply({ embeds: [embed] });
    },
};
