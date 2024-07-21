const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rent-setrent")
        .setDescription("Sets the rent of a person in the household")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("rent")
                .setDescription("Monthly base rent for this person")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const user = interaction.options.getUser("user");
        const rent = interaction.options.getNumber("rent");

        // Get the person from the database
        const person = await getDoc(doc(db, "people", user.id));
        if (!person.exists()) {
            interaction.reply("Cannot set rent of someone who is not in the house!");
            return;
        }

        await setDoc(doc(db, "rent", user.id), {
            rent,
            reminders: [],
        });
        interaction.reply({
            content: `Rent set for **${person.data().name}** (user ${user}) at **$${rent}**`,
        });
    },
};
