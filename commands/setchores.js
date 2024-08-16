const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

const freqList = ["weekly", "biweekly", "monthly", "seasonally"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setchores")
        .setDescription("Sets a set of chores")
        .addStringOption((option) =>
            option
                .setName("frequency")
                .setDescription("weekly | biweekly | monthly | seasonally")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("list")
                .setDescription("List of chores, seperated by commas")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const frequency = interaction.options.getString("frequency");
        const list = interaction.options.getString("list");

        // Make sure frequency valid
        if (freqList.indexOf(frequency) === -1) {
            interaction.reply(
                "Frequency must be one of: " + freqList.join(", ")
            );
            return;
        }

        // Make sure settings chores object is defined
        if (!settings.chores) {
            settings.chores = {};
        }

        // Parse list
        const split = list.split(",").map((s) => s.trim());
        settings.chores[frequency] = split;
        await setDoc(doc(db, "settings", "0"), settings);

        interaction.reply({
            content: `Saved ${frequency} chores: ${split.join(", ")}`,
        });
    },
};
