const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setstrikes")
        .setDescription("Sets the total number of strikes for a person")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to modify")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("strikes")
                .setDescription("Number of strikes to set for the person")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const user = interaction.options.getUser("user");
        const strikes = interaction.options.getNumber("strikes");

        // Get user
        let personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply("Cannot modify chores of people not in house!");
            return;
        }
        let person = personRef.data();

        person.strikes = strikes;
        setDoc(personRef.ref, person);

        interaction.reply({
            content: `Set total number of strikes for <@${personRef.id}> to ${strikes}.`,
        });
    },
};
