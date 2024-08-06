const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rent-setutilities")
        .setDescription(
            "Sets the cost of utilities per person per month (eg. $500/mo for 5 people = 100)"
        )
        .addNumberOption((option) =>
            option
                .setName("utilities")
                .setDescription("Monthly utilities cost")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        settings.utilities = interaction.options.getNumber("utilities");
        setDoc(doc(db, "settings", "0"), settings);

        interaction.reply({
            content: `Utilities set at $${settings.utilities}`,
        });
    },
};
