const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vacation")
        .setDescription(
            "Sets a person to be 'on vacation' for the next week, meaning they won't be assigned chores."
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Monthly utilities cost")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("date")
                .setDescription(
                    "Alternative week for vacation, any day of week, format MM-DD-YYYY"
                )
        )
        .addBooleanOption((option) =>
            option
                .setName("toggle")
                .setDescription(
                    "Set to False if you want to toggle vacation status off"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const user = interaction.options.getUser("user");
        const date = interaction.options.getString("date");
        const toggle = interaction.options.getBoolean("toggle");

        // Get user
        let personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "People who are not part of the house cannot go on vacation!"
            );
            return;
        }
        let person = personRef.data();

        // Use inputted date or use today's
        let now = dayjs().tz("America/Chicago").add(1, "week");
        if (date) {
            now = dayjs.tz(date, "MM-DD-YYYY", "America/Chicago");
        }

        // Add 1 week and get monday date, then save to user
        const nextMon = now.day(1).format("MM-DD-YYYY");

        if (!person.vacations) {
            person.vacations = [];
        }

        let mod = "Added";
        if (toggle === undefined || toggle === null || toggle) {
            person.vacations.push(nextMon);
        } else {
            const idx = person.vacations.indexOf(nextMon);
            if (idx !== -1) person.vacations.splice(nextMon);
            mod = "Removed";
        }
        setDoc(personRef.ref, person);

        interaction.reply({
            content: `${mod} vacation for week of **${nextMon}** for ${user}`,
        });
    },
};
