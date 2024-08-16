const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    getDocs,
    collection,
    writeBatch,
} = require("firebase/firestore");
const { deleteChoreNotifs, assignChoresAndNotifs } = require("../src/chores");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-resetchores")
        .setDescription(
            "Resets the chores for all users (WILL MESS UP CURRENT ASSIGNMENT ORDER!)"
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        await deleteChoreNotifs();
        await assignChoresAndNotifs(interaction.guild, db, settings);

        interaction.reply("All chores have been reset!");
    },
};
