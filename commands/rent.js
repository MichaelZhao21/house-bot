const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rent")
        .setDescription("Gets your current rent status"),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        // Get user's doc
        let personRef = await getDoc(doc(db, "people", interaction.user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house do not have rent assigned!"
            );
            return;
        }
        let user = personRef.data();

        // Get monies
        const payMonth = dayjs().format("MM-YYYY");
        const total = user.rent + settings.utilities;
        const owes = total - (user.paid[payMonth] ?? 0);
        const msg = owes === 0 ? "nothing (thanks for paying)" : "$" + owes;

        const embed = new EmbedBuilder()
            .setColor(0xaf99ff)
            .setTitle(`Rent for the month of ${payMonth}`)
            .setDescription(`You owe **${msg}**, out of a total of $${total}`);
        interaction.reply({ embeds: [embed] });
    },
};
