const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setrent")
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
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const user = interaction.options.getUser("user");
        const rent = interaction.options.getNumber("rent");

        // Get the person from the database
        const personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "Cannot set rent of someone who is not in the house!"
            );
            return;
        }

        const person = personRef.data();
        person.rent = rent;
        await setDoc(personRef.ref, person);

        interaction.reply({
            content: `Rent set for **${
                person.name
            }** (user ${user}) at **$${rent}**`,
        });
    },
};
