const dayjs = require("dayjs");
const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chores-finishchore")
        .setDescription("Sets a chore to done")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the chore that was finished")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const name = interaction.options.getString("name");

        const date = dayjs().day(0).format("M-D-YYYY");

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
        }
        else {
            weekDoc = weekDocRes.data();
        }

        // Make sure the chore exists
        if (!weekChores.hasOwnProperty(name)) {
            interaction.reply("Invalid chore name! Expected one of " + Object.keys(weekChores).toString());
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
