const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");
const dayjs = require("dayjs");
const objectSupport = require("dayjs/plugin/objectSupport");

dayjs.extend(objectSupport);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-payrent")
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
        const payMonth = now.format("MM-YYYY");

        // Get person
        const personRef = await getDoc(doc(db, "people", user.id));
        if (!personRef.exists()) {
            interaction.reply(
                "Cannot pay rent of someone who is not in the house!"
            );
            return;
        }
        const person = personRef.data();

        // Create paid object if doesn't exist
        if (!person.paid) {
            person.paid = {};
        }

        // Calculate amount to pay
        const paid = person.paid[payMonth] ?? 0;
        const total = person.rent + settings.utilities;
        let toPay = total - paid;
        if (!amount) {
            person.paid[payMonth] = total;
        } else {
            if (total - paid < amount) {
                interaction.reply(
                    `${user} only owes $${
                        total - paid
                    }, which is less than $${amount}!`
                );
                return;
            }
            person.paid[payMonth] = paid + amount;
            toPay = amount;
        }

        // Save data
        await setDoc(doc(db, "people", user.id), person);
        interaction.reply(
            `**${user}** logged as having paid **$${
                person.paid[payMonth]
            }** for **${
                now.month() + 1
            }/${now.year()}** out of a total of **$${total}** owed for the month`
        );
    },
};
