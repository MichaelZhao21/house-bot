const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chores-addchore")
        .setDescription("Adds a chore entry")
        .addStringOption((option) =>
            option
                .setName("key")
                .setDescription("Key of the chore to refer to on the spreadsheet")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Full display name of the chore")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("description")
                .setDescription("Set description of the chore")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const key = interaction.options.getString("key");
        const name = interaction.options.getString("name");
        const description = interaction.options.getString("description") ?? "";

        await setDoc(doc(db, "chores", key), {
            name,
            description
        });
        interaction.reply({
            content: `Chore **${name}** (${key}) added - ${description}`
        });
    },
};
