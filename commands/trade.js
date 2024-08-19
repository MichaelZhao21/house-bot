const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    setDoc,
    doc,
    getDoc,
    writeBatch,
} = require("firebase/firestore");
const { sendNotif, newMessage } = require("../src/notifications");
const dayjs = require("dayjs");
const { addPendingTrade } = require("../src/trades");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("trade")
        .setDescription("Trades a chore with another user")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to trade with")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("yours")
                .setDescription(
                    "Name of your chore (write 'nothing' if you are not giving a chore away)"
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("theirs")
                .setDescription(
                    "Name of the other person's chore (write 'nothing' if you are not taking a chore)"
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
        const user = interaction.options.getUser("user");
        const yours = interaction.options.getString("yours");
        const theirs = interaction.options.getString("theirs");

        // Get current person
        let youRef = await getDoc(doc(db, "people", interaction.user.id));
        if (!youRef.exists()) {
            interaction.reply(
                "People who are not part of the house cannot trade (you are not in the house)!"
            );
            return;
        }
        let you = youRef.data();

        // Get other person
        let themRef = await getDoc(doc(db, "people", user.id));
        if (!themRef.exists()) {
            interaction.reply(
                "People who are not part of the house cannot trade (other person is not in the house)!"
            );
            return;
        }
        let them = themRef.data();

        const nameMapKeys = Object.keys(settings.chores.nameMap);

        // Make sure chores exist
        if (yours !== "nothing" && nameMapKeys.indexOf(yours) === -1) {
            interaction.reply(`**${yours}** is not a valid chore!`);
            return;
        }
        if (theirs !== "nothing" && nameMapKeys.indexOf(theirs) === -1) {
            interaction.reply(`**${theirs}** is not a valid chore!`);
            return;
        }
        const yc = you.chores.indexOf(yours);
        if (yours !== "nothing" && yc === -1) {
            interaction.reply(`You do not have a chore named **${yours}**!`);
            return;
        }
        const tc = them.chores.indexOf(theirs);
        if (theirs !== "nothing" && tc === -1) {
            interaction.reply(
                `The other person does not have a chore named **${theirs}**!`
            );
            return;
        }

        const yd = yours === "nothing" ? "[nothing]" : yours;
        const td = theirs === "nothing" ? "[nothing]" : theirs;

        // Notify other person
        const theirChannel = interaction.guild.channels.cache.get(
            them.notifChannel
        );
        const msg = await sendNotif(
            theirChannel,
            themRef.id,
            newMessage(
                `${you.name} wants to trade a chore with you`,
                `They are offering to trade your chore **${td}** for ${you.name}'s chore **${yd}**.\nPlease reply **yes** or **no** to this message to accept or reject the trade.`,
                0xb8e4ff,
                `chore-trade-${you.name}-${them.name}`
            )
        );

        await interaction.reply({
            content: `Made a trade offer of your chore **${yd}** with <@${themRef.id}>'s chore **${td}**. Please notify them and have them reply to the bot with YES or NO.`,
        });

        // Create the trade object
        const tradeId = dayjs().valueOf().toString();
        await setDoc(doc(db, "trades", tradeId), {
            youId: youRef.id,
            themId: themRef.id,
            yours,
            theirs,
            msg: msg.id,
        });
        addPendingTrade(tradeId, msg.id);
    },
};
