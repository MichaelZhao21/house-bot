const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addperson")
        .setDescription("Adds a person to the household")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Full name of the user")
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
        const name = interaction.options.getString("name");

        await setDoc(doc(db, "people", String(user)), {
            name,
            username: user.username,
        });
        interaction.reply({
            content: `**${name}** (user ${user}) successfully added to home`,
        });
    },
};
