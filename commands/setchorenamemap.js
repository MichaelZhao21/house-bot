const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setchorenamemap")
        .setDescription("Sets the display name map for the chores")
        .addStringOption((option) =>
            option
                .setName("map")
                .setDescription("Name map, format: <key>-<display>,[...]")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const raw = interaction.options.getString("map");

        // Make sure settings chores object is defined
        if (!settings.chores) {
            settings.chores = {};
        }

        // Parse list and save
        const rs = raw.split(",");
        settings.chores.nameMap = {};
        rs.forEach((s) => {
            const ss = s.split("_");
            settings.chores.nameMap[ss[0]] = ss[1];
        });
        await setDoc(doc(db, "settings", "0"), settings);

        interaction.reply("Updated chore name map successfully!");
    },
};
