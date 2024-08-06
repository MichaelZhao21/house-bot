const { parse } = require("csv-parse");
const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, writeBatch } = require("firebase/firestore");

/**
 * Format for chores:
 *
 * week | <list of chores>
 * <week> | <names in each cell of the person who is in charge of that chore for that week>
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName("chores-setchores")
        .setDescription(
            "Sets the chores from a CSV file. See house spreadsheet 'chore-export' sheet for format."
        )
        .addAttachmentOption((option) =>
            option
                .setName("sheet")
                .setDescription("Spreadsheet upload")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        const att = interaction.options.getAttachment("sheet");

        // Validate attachment
        if (!att.contentType || att.contentType.indexOf("csv") === -1) {
            interaction.reply("File must be in CSV format!");
            return;
        }

        // Download attachment
        const data = await fetch(att.url).then((data) => data.text());

        // Read file
        const records = parse(data, { columns: true });

        // Write batch to db
        const batch = writeBatch(db);
        await records.forEach((record) => {
            const { week, ...data } = record;
            batch.set(doc(db, "chorelist", week), data);
        });
        await batch.commit();

        interaction.reply({
            content: "Successfully updated chore list",
        });
    },
};
