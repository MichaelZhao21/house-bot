const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-addonechore")
        .setDescription("Removes all chores from a person")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the chore to add")
                .setRequired(true)
        )
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
        const name = interaction.options.getString("name");
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

        // Get settings
        let settingsRef = await getDoc(doc(db, "settings", "0"));
        let settings = settingsRef.data();

        // Get the keys of the nameMap
        let keys = Object.keys(settings.chores.nameMap);
        if (!keys.includes(name)) {
            interaction.reply(
                "Chore name must be one of: " + keys.join(", ")
            );
            return;
        }

        // Add chore to user
        user.chores.push(name);

        // Save person
        await setDoc(personRef.ref, user);

        interaction.reply({
            content: `Added chore ${name} to **${userObj}**`,
        });
    },
};
