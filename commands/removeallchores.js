const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-removeallchores")
        .setDescription("Removes all chores from a person")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Who to remove all chores from")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const userObj = interaction.options.getUser("user");

        // Get user
        let personRef = await getDoc(
            doc(db, "people", userObj ? userObj.id : interaction.user.id)
        );
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house cannot finish chores!"
            );
            return;
        }
        let user = personRef.data();

        // Remove all chores from user
        user.chores = [];

        // Save person
        await setDoc(personRef.ref, user);

        interaction.reply({
            content: `Remove all chores from **${userObj}**`,
        });
    },
};
