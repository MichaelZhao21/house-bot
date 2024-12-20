const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-addperson")
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

        await setDoc(doc(db, "people", user.id), {
            name,
            username: user.username,
            paid: {},
            rent: 0,
            chores: [],
            choresDone: [],
            vacations: [],
            choreNotifs: [],
            strikes: 0,
            extraChores: 0,
        });
        interaction.reply({
            content: `**${name}** (user ${user}) successfully added to home`,
        });
    },
};
