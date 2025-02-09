const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, doc, getDoc, getDocs, collection } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("strikes")
        .setDescription("Gets the number of strikes you have")
        .addBooleanOption((option) =>
            option
                .setName("showall")
                .setDescription(
                    "Set to true to show strikes for all users (default false)"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        // Get show all option
        const showall = interaction.options.getBoolean("showall");
        if (showall) {
            // Get all users
            const peopleRef = await getDocs(collection(db, "people"));
            const people = peopleRef.docs.map((doc) => doc.data());

            const embed = new EmbedBuilder()
                .setColor(0xaf99ff)
                .setTitle("All chores")
                .setDescription("Here is a list of strikes for everyone")
                .setFields(people.map((person) => ({
                    name: `${person.name} (${person.username})`,
                    value: `${person.strikes} strike(s)`,
                }))
                );

            interaction.reply({ embeds: [embed] });
            return;
        }

        // Get user's doc
        let personRef = await getDoc(doc(db, "people", interaction.user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house do not have chores assigned!"
            );
            return;
        }
        let user = personRef.data();

        const embed = new EmbedBuilder()
            .setColor(0xaf99ff)
            .setTitle("Your chores for this week")
            .setDescription(`You have **${user.strikes}** strikes.`);
        interaction.reply({ embeds: [embed] });
    },
};
