const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-removestrikes")
        .setDescription("Removes a number of strikes for a person given a reason")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to modify")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for removing strikes")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("strikes")
                .setDescription("Number of strikes to remove from the person")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const user = interaction.options.getUser("user");
        const strikes = interaction.options.getNumber("strikes") ?? 1;
        const reason = interaction.options.getString("reason");

        // Get user
        let personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply("Cannot modify chores of people not in house!");
            return;
        }
        let person = personRef.data();

        // Make sure strikes are not negative
        if (person.strikes - strikes < 0) {
            interaction.reply("Cannot remove more strikes than the person has!");
            return;
        }

        person.strikes -= strikes;
        setDoc(personRef.ref, person);

        const embed = new EmbedBuilder()
            .setColor(0xaf99ff)
            .setTitle(`Removing Strike from ${person.name}`)
            .setDescription(`Removed **${strikes} strike(s)** from ${person.name} for reason: **${reason}**. ${person.name} now has **${person.strikes} strike(s)**.`);

        interaction.reply({
            content: `Removed ${strikes} strike(s) from ${user}.`,
            embeds: [embed],
        });
    },
};
