const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const objectSupport = require("dayjs/plugin/objectSupport");

dayjs.extend(objectSupport);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rent-payrent")
        .setDescription("Sets the amount of rent a person paid for the month")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("amount")
                .setDescription(
                    "Amount of rent paid, leave blank if they paid all rent"
                )
        )
        .addNumberOption((option) =>
            option
                .setName("month")
                .setDescription(
                    "The month (MM) to update rent, leave blank for current month"
                )
                .setMinValue(1)
                .setMaxValue(12)
        )
        .addNumberOption((option) =>
            option
                .setName("year")
                .setDescription(
                    "The year (YYYY) to update rent, leave blank for current year"
                )
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        // Add person to the database
        const user = interaction.options.getUser("user");
        const amount = interaction.options.getNumber("amount");
        const month = interaction.options.getNumber("month");
        const year = interaction.options.getNumber("year");

        // Make sure not only one is defined
        if ((!month && !!year) || (!!month && !year)) {
            interaction.reply("Error: both month and year must be defined!");
            return;
        }

        let now = dayjs();
        if (!!month && !!year) {
            now = dayjs({
                year: year,
                month: month - 1,
                day: 0,
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
        }

        // Set index of paid array
        const payMonth = now.diff(dayjs(settings.rentStart), "months");

        // Get rent
        const personRes = await getDoc(doc(db, "rent", user.id));
        if (!personRes.exists()) {
            interaction.reply(
                "Cannot pay rent of someone who is not in the house and doesn't have rent set! Use **addperson** and **setrent** to add them to the house."
            );
            return;
        }
        const person = personRes.data();

        // Calculate amount to pay
        const toPay = amount ? amount : person.rent + settings.utilities;
        person.paid[payMonth] = toPay;

        await setDoc(doc(db, "rent", user.id), person);
        interaction.reply({
            content: `**${user}** logged as having paid $${toPay} for ${
                now.month() + 1
            }/${now.year()}`,
        });
    },
};
