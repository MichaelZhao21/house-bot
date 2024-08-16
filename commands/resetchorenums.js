const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    getDocs,
    collection,
    writeBatch,
} = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-resetchorenums")
        .setDescription(
            "Resets the chore order numbers for each user (WILL MESS UP CURRENT ASSIGNMENT ORDER!)"
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const users = await getDocs(collection(db, "people"));
        const batch = writeBatch(db);
        users.docs.forEach((v, i) => {
            batch.update(v.ref, { number: i });
        });
        await batch.commit();

        interaction.reply("All user chore ordering numbers reset!");
    },
};
