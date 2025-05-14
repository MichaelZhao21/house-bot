const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const objectSupport = require("dayjs/plugin/objectSupport");
const { setEventAlarm } = require("../src/events");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editevent")
        .setDescription(
            "Updates an existing event by ID. Any field not set will not be updated."
        )
        .addStringOption((option) =>
            option
                .setName("id")
                .setDescription("Unique ID used to identify the event")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("title").setDescription("Title of the event")
        )
        .addStringOption((option) =>
            option
                .setName("subtitle")
                .setDescription("Description of the event")
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

        // Get previous event
        const id = interaction.options.getString("id");
        const prevEvent = await getDoc(doc(db, "events", id));
        if (!prevEvent.exists()) {
            interaction.reply(
                `Event with ID **${id}** does not exist! Please check the ID and try again.`
            );
            return;
        }
        const prevData = prevEvent.data();

        const prevTime = dayjs(prevData.time).tz("America/Chicago");

        // Get fields
        const year = interaction.options.getInteger("year") ?? prevTime.year();
        const month =
            interaction.options.getInteger("month") ?? prevTime.month() + 1;
        const day = interaction.options.getInteger("day") ?? prevTime.date();
        const hour = interaction.options.getInteger("hour") ?? prevTime.hour();
        const minute =
            interaction.options.getInteger("minute") ?? prevTime.minute();
        const second = 0;
        const title =
            interaction.options.getString("title") ?? prevData.title;
        const subtitle =
            interaction.options.getString("subtitle") ?? prevData.subtitle;

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

        // Create event object
        const newEvent = {
            title,
            subtitle,
            time: future.utc().valueOf(),
        };

        // Update the event in the database
        await setDoc(doc(db, "events", id), newEvent);

        // Set the alarm for the event
        try {
            const channel = interaction.guild.channels.cache.get(
                settings.notifChannel
            );
            setEventAlarm({ id, ...newEvent }, channel);
        } catch (e) {
            interaction.reply(e);
            return;
        }

        // Tell the user
        interaction.reply(
            `Event **${title}** (${id}) will happen <t:${futureStr}:R>!`
        );
    },
};
