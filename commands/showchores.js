const dayjs = require("dayjs");
const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, getDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chores-showchores")
        .setDescription("Shows a list of all chores for this week")
        .addBooleanOption((option) =>
            option
                .setName("show-all")
                .setDescription(
                    "Set true to see all chores, even finished ones"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const showAll = !!interaction.options.getBoolean("show-all");
        const date = dayjs().day(0).format("M-D-YYYY");

        // Get all chores for the week and their done status
        const choreListRes = await getDoc(doc(db, "chorelist", date));
        if (!choreListRes.exists()) {
            interaction.reply(
                "Could not get chore list for this week... are you sure it exists?"
            );
            return;
        }
        const choreList = choreListRes.data();

        // Make sure this week's doc exists
        const weekDocRes = await getDoc(doc(db, "choredone", date));
        let choreDone;
        if (!weekDocRes.exists()) {
            choreDone = {};
            Object.keys(choreList).forEach((k) => (choreDone[k] = false));
        } else {
            choreDone = weekDocRes.data();
        }

        const fields = [];
        Object.entries(choreList).forEach(([k, v]) => {
            if (!showAll && choreDone[k]) return;
            if (v === "") return;
            fields.push({
                name: k,
                value: v + " - " + (choreDone[k] ? "done" : "INCOMPLETE"),
            });
        });

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xa8ffde)
            .setTitle(`Chore List for this Week (${date})`)
            .setThumbnail(
                "https://c8.alamy.com/comp/2DHAFW4/sweeping-floor-rgb-color-icon-2DHAFW4.jpg"
            )
            .addFields(fields)
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },
};
