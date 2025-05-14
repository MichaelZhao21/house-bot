const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    getDocs,
    collection,
    writeBatch,
    doc,
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
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const users = await getDocs(collection(db, "people"));
        const batch = writeBatch(db);
        users.docs.forEach((v, i) => {
            batch.update(v.ref, { number: i });
        });

        settings.total = users.size;
        settings.trashNum = 0;
        settings.recyclingNum = 0;
        settings.kitchenNum = 0;
        batch.update(doc(db, "settings", "0"), settings);

        await batch.commit();

        interaction.reply("All user chore ordering numbers reset!");
    },
};
