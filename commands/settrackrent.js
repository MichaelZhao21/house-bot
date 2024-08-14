const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-settrackrent")
        .setDescription(
            "Sets whether or not to track rent (notifications + strikes)"
        )
        .addBooleanOption((option) =>
            option
                .setName("checkbox")
                .setDescription("True if tracking rent")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        settings.tracking = interaction.options.getBoolean("checkbox");
        setDoc(doc(db, "settings", "0"), settings);

        interaction.reply({
            content: `Rent tracking is **${settings.tracking ? "ENABLED" : "DISABLED"}**`,
        });
    },
};
