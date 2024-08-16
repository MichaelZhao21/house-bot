const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-modchores")
        .setDescription(
            "Modifies chores for a person, either adding or removing one"
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to modify")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the chore to modify")
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("add")
                .setDescription(
                    "Set true to add, false to remove, defaults to add"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const user = interaction.options.getUser("user");
        const name = interaction.options.getString("name");
        const add = interaction.options.getBoolean("add");

        // Get user
        let personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply("Cannot modify chores of people not in house!");
            return;
        }
        let person = personRef.data();

        // Modify list
        let mod = "Added";
        if (add === undefined || add == null || add) {
            person.choreList.push(name);
        } else {
            mod = "Removed"
            const idx = person.choreList.indexOf(name);
            if (idx !== -1) person.choreList.splice(idx); 
        }

        interaction.reply({
            content: `${mod} chore **${name}** from ${user}`,
        });
    },
};
