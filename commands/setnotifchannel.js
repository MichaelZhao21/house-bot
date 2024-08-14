const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const { Firestore, setDoc, doc, getDoc } = require("firebase/firestore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-setnotifchannel")
        .setDescription("Sets the channel for the bot to use for notifications")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Channel tag")
                .setRequired(true)
        )
        .addUserOption((option) =>
            option.setName("user").setDescription("User's notification channel")
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        const channel = interaction.options.getChannel("channel");
        const user = interaction.options.getUser("user");

        if (!user) {
            settings.notifChannel = channel.id;
            settings.guild = channel.guild.id;
            await setDoc(doc(db, "settings", "0"), settings);
        } else {
            const userDoc = (await getDoc(doc(db, "people", user.id))).data();
            userDoc.notifChannel = channel.id;
            userDoc.guild = channel.guild.id;
            await setDoc(doc(db, "people", user.id), userDoc);
        }

        interaction.reply(`Updated notification channel to ${channel}`);
    },
};
