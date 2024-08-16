const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chores")
        .setDescription("Gets your current list of chores"),

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
                "People who are not part of the house do not have chores assigned!"
            );
            return;
        }
        let user = personRef.data();

        const msg =
            user.chores.length === 0
                ? "nothing (thanks for completing them!)"
                : "\n" +
                  user.chores
                      .map((c) => `- ${settings.chores.nameMap[c]} [${c}]`)
                      .join("\n");

        const embed = new EmbedBuilder()
            .setColor(0xaf99ff)
            .setTitle("Your chores for this week")
            .setDescription(`Here are the chores you have left: ${msg}`);
        interaction.reply({ embeds: [embed] });
    },
};
