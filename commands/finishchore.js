const dayjs = require("dayjs");
const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("finish")
        .setDescription("Marks a chore as done/completed")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the chore that was finished")
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("finished")
                .setDescription(
                    "Can set to false if you want to mark a chore as UNfinished"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const name = interaction.options.getString("name");

        // Get alternative option if defined
        const fOp = interaction.options.getBoolean("finished");
        const finished = fOp === null || fOp === undefined ? true : fOp;

        const date = dayjs().day(0).format("M-D-YYYY");

        // TODO: MODIFY AND COMPLTE THE BOTTOM SECTION FOR CHORES

        // Get the list of this week's chores
        const weekChoresRes = await getDoc(doc(db, "chorelist", date));
        if (!weekChoresRes.exists()) {
            interaction.reply(
                "No chores set for this week (week of " + date + ")"
            );
            return;
        }
        const weekChores = weekChoresRes.data();

        // Make sure this week's doc exists
        const weekDocRes = await getDoc(doc(db, "choredone", date));
        let weekDoc;
        if (!weekDocRes.exists()) {
            weekDoc = {};
            Object.keys(weekChores).forEach((k) => (weekDoc[k] = false));
        } else {
            weekDoc = weekDocRes.data();
        }

        // Make sure the chore exists
        if (!weekChores.hasOwnProperty(name)) {
            interaction.reply(
                "Invalid chore name! Expected one of " +
                    Object.keys(weekChores).toString()
            );
            return;
        }

        // Set chore to done and store in DB
        weekDoc[name] = true;
        await setDoc(doc(db, "choredone", date), weekDoc);
        interaction.reply({
            content: `Chore **${name}** completed!`,
        });
    },
};
