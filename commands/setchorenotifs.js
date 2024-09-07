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

const dayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
};

/**
 * Maps name of the day to an integer
 * @param {string} input Input string
 * @returns -1 if bad input, otherwise see day map above
 */
function getDay(input) {
    input = input.toLowerCase();
    if (Object.keys(dayMap).indexOf(input) === -1) return -1;
    return dayMap[input];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setchorenotifs")
        .setDescription("Sets your own notifications for your chores")
        .addStringOption((option) =>
            option
                .setName("notifs")
                .setDescription(
                    "Comma separated notif list with format <Weekdate> <HH:mm> (eg. 'Monday 17:00, Saturday 07:00')"
                )
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        try {
            const raw = interaction.options.getString("notifs");

            // Get user
            let personRef = await getDoc(
                doc(db, "people", interaction.user.id)
            );
            if (!personRef.exists()) {
                interaction.reply("You are not part of the house!");
                return;
            }
            let person = personRef.data();

            // Parse the list of notifications
            const parsed = raw.split(",").map((s) => {
                const st = s.trim();
                const stp = st.split(" ");
                if (stp.length !== 2) {
                    interaction.reply(
                        `Invalid format [${st}], must be in the format <Weekday> <HH:mm>`
                    );
                    throw new Error();
                }
                const day = getDay(stp[0]);
                if (day === -1) {
                    interaction.reply(
                        `Invalid day of week format [${stp[0]}] from [${st}], must be one of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`
                    );
                    throw new Error();
                }
                const time = dayjs.tz(
                    stp[1].trim(),
                    "HH:mm",
                    "America/Chicago"
                );
                const timeStr = time.format("HH:mm");

                // No alarms at or before 7 am on Monday (as chores are assigned then)
                if (day === 1 && time.hour() <= 7) {
                    interaction.reply(
                        `Invalid alarm time set: ${st} -- must be after Monday 7am as that's when chores are set`
                    );
                    throw new Error();
                }

                return `${day}-${timeStr}`;
            });

            person.choreNotifs = parsed;
            await setDoc(personRef.ref, person);

            // Restart notifications
            clearTasks(`chore-notif-${personRef.id}`);
            setOneChoreNotif(interaction.guild, db, settings, await getDoc(personRef.ref));

            interaction.reply({
                content: `Set chore notifications (day-HHmm): [${parsed.join(
                    ", "
                )}]`,
            });
        } catch (e) {}
    },
};
