const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const objectSupport = require("dayjs/plugin/objectSupport");
const { startTimer } = require("../reminders");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remindme")
        .setDescription(
            "Reminds you at a specific time. Any fields not set will default to the current datetime."
        )
        .addIntegerOption((option) =>
            option.setName("year").setDescription("Year (YYYY)")
        )
        .addIntegerOption((option) =>
            option.setName("month").setDescription("Month (MM)")
        )
        .addIntegerOption((option) =>
            option.setName("day").setDescription("Day (DD)")
        )
        .addIntegerOption((option) =>
            option.setName("hour").setDescription("Hour (HH)")
        )
        .addIntegerOption((option) =>
            option.setName("minute").setDescription("Minute (mm)")
        )
        .addIntegerOption((option) =>
            option.setName("second").setDescription("Second (ss)")
        )
        .addStringOption((option) =>
            option.setName("message").setDescription("Message for the reminder")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        // Current time
        const now = dayjs().tz("America/Chicago");

        // Get fields
        const year = interaction.options.getInteger("year") ?? now.get("year");
        const month =
            interaction.options.getInteger("month") ?? now.get("month") + 1;
        const day = interaction.options.getInteger("day") ?? now.get("date");
        const hour = interaction.options.getInteger("hour") ?? now.get("hour");
        const minute =
            interaction.options.getInteger("minute") ?? now.get("minute");
        const second =
            interaction.options.getInteger("second") ?? now.get("second");
        const message = interaction.options.getString("message") ?? "[no message]";

        // Calculate time and make sure it's valid
        const future = dayjs({
            year,
            month: month - 1,
            day,
            hour,
            minute,
            second,
        }).tz("America/Chicago", true);
        const futureStr = Math.floor(future.utc().valueOf() / 1000);
        if (future.isBefore(now)) {
            interaction.reply(
                `Invalid time! You entered <t:${futureStr}:F>, which is in the past already.`
            );
            return;
        }

        // Save the time
        settings.notifs.push({
            type: "Remind me",
            time: future.utc().valueOf(),
            user: interaction.user.id,
            message,
        });
        await setDoc(doc(db, "settings", "0"), settings);

        // Start the timer
        try {
            const channel = interaction.guild.channels.cache.get(
                settings["notif-channel"]
            );
            startTimer(
                channel,
                future.utc().valueOf(),
                "Remind me",
                message,
                interaction.user.id
            );
        } catch (e) {
            interaction.reply(e);
            return;
        }

        // Tell the user
        interaction.reply(
            `Reminder has been set to go off <t:${futureStr}:R>!`
        );
    },
};
