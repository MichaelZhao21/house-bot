const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(timezone);

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
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Other user's chore to finish if applicable")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const name = interaction.options.getString("name");
        const otherUser = interaction.options.getUser("user");

        // Get alternative option if defined
        const fOp = interaction.options.getBoolean("finished");
        const finished = fOp === null || fOp === undefined ? true : fOp;

        const date = dayjs().tz("America/Chicago").day(0).format("MM-DD-YYYY");

        // Get user
        let personRef = await getDoc(
            doc(db, "people", otherUser ? otherUser.id : interaction.user.id)
        );
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house cannot finish chores!"
            );
            return;
        }
        let user = personRef.data();

        // Make choresDone object if not exists
        if (!user.choresDone) {
            user.choresDone = {};
        }
        if (!user.choresDone[date]) {
            user.choresDone[date] = [];
        }

        // Move finished chore to done array
        const a = finished ? user.chores : user.choresDone[date];
        const b = finished ? user.choresDone[date] : user.chores;
        const cd = finished ? "chores" : "completed chores";

        const idx = a.indexOf(name);
        if (idx === -1) {
            const choreStr = a.join(", ");
            interaction.reply(
                `Could not find chore **${name}**. Your ${cd} for this week are ${choreStr}`
            );
            return;
        }
        a.splice(idx, 1);
        b.push(name);

        // Save person
        await setDoc(personRef.ref, user);

        const msg = finished ? "completed!" : "set to uncompleted";
        interaction.reply({
            content: `Chore **${name}** ${msg}`,
        });
    },
};
