const {
    SlashCommandBuilder,
    CommandInteraction,
} = require("discord.js");
const { Firestore, setDoc, doc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setnotifchannel")
        .setDescription("Sets the channel for the bot to use for notifications")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Channel tag")
                .setRequired(true)
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const channel = interaction.options.getChannel("channel");

        settings.notifChannel = channel.id;
        settings.guild = channel.guild.id;
        await setDoc(doc(db, "settings", "0"), settings);

        interaction.reply(`Updated notification channel to ${channel}`);
    },
};
