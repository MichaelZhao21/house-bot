const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { clearTasks } = require("../src/notifications");
const { setOneChoreNotif } = require("../src/chores");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const dayList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getchorenotifs")
        .setDescription("Gets your own notifications for your chores"),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        // Get user
        let personRef = await getDoc(
            doc(db, "people", interaction.user.id)
        );
        if (!personRef.exists()) {
            interaction.reply("You are not part of the house!");
            return;
        }
        let person = personRef.data();

        // Add each notification
        let message = "Your current chore notifications:\n**";
        person.choreNotifs.forEach((x) => {
            const split = x.split("-");
            const day = Number(split[0]);
            const time = split[1];

            message += `${dayList[day]} ${time}, `;
        });

        interaction.reply(message.slice(0, -2) + "**");
    },
};
