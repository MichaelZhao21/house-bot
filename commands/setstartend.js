const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");
const dayjs = require("dayjs");
const objectSupport = require("dayjs/plugin/objectSupport");

dayjs.extend(objectSupport);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rent-setstartend")
        .setDescription("Set the start and end dates of the rent")
        .addNumberOption((option) =>
            option
                .setName("startmonth")
                .setDescription("The start month (MM) to start tracking rent")
                .setMinValue(1)
                .setMaxValue(12)
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("startyear")
                .setDescription("The start year (YYYY) to start tracking rent")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("endmonth")
                .setDescription(
                    "The end month (MM) to stop tracking rent (inclusive)"
                )
                .setMinValue(1)
                .setMaxValue(12)
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("endyear")
                .setDescription(
                    "The end year (YYYY) to stop tracking rent (inclusive)"
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
        // Add person to the database
        const startMonth = interaction.options.getNumber("startmonth");
        const startYear = interaction.options.getNumber("startyear");
        const endMonth = interaction.options.getNumber("endmonth");
        const endYear = interaction.options.getNumber("endyear");

        // Parse dates
        const start = dayjs({
            year: startYear,
            month: startMonth - 1,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const end = dayjs({
            year: endYear,
            month: endMonth - 1,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        });

        // Set settings
        settings.rentStart = start.valueOf();
        settings.rentEnd = end.valueOf();

        await setDoc(doc(db, "settings", "0"), settings);
        interaction.reply({
            content: `Set interval of rent cycles to: ${startMonth}/${startYear} - ${endMonth}/${endYear}`,
        });
    },
};
