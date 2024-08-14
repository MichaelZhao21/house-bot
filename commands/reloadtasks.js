const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore } = require("firebase/firestore");
const { reloadAllTasks } = require("../src/notifmain");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-reloadtasks")
        .setDescription("Restarts all running tasks"),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const guild = interaction.guild;
        await reloadAllTasks(guild, db, settings);

        interaction.reply("Reloaded all tasks successfully!");
    },
};
