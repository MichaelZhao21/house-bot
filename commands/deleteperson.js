const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    doc,
    deleteDoc,
    getDoc,
} = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deleteperson")
        .setDescription("Removes a person from the household")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to remove")
                .setRequired(true)
        ),
    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        // Add person to the database
        const user = interaction.options.getUser("user");

        // Make sure person exists
        const docRef = doc(db, "people", String(user));
        const person = await getDoc(docRef);
        if (!person.exists()) {
            interaction.reply({
                content: `Cannot remove ${user} as they aren't part of the house`,
                ephemeral: true,
            });
            return;
        }

        const name = person.get('name');
        await deleteDoc(docRef);

        interaction.reply({
            content: `**${name}** (user ${user}) successfully removed from home`,
        });
    },
};
