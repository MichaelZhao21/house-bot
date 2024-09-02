const { Message, MessageType } = require("discord.js");
const {
    getDocs,
    collection,
    getDoc,
    doc,
    writeBatch,
    Firestore,
} = require("firebase/firestore");
const { newMessage, sendNotif } = require("./notifications");

const pendingTrades = new Map();

async function loadTrading(db) {
    // Load all trade options
    (await getDocs(collection(db, "trades"))).forEach((d) => {
        pendingTrades.set(d.data().msg, d.id);
    });
}

async function addPendingTrade(tradeId, msgId) {
    pendingTrades.set(msgId, tradeId);
}

/**
 *
 * @param {Firestore} db
 * @param {Message<Boolean>} interaction
 */
async function acceptTrade(db, settings, interaction) {
    // Ignore bots and non trade messages
    if (interaction.author.bot) return;
    if (
        interaction.type !== MessageType.Reply ||
        !pendingTrades.has(interaction.reference.messageId)
    )
        return;

    // Make sure they either say yes or no
    if (
        interaction.content.toLowerCase().indexOf("no") === -1 &&
        interaction.content.toLowerCase().indexOf("yes") === -1
    ) {
        interaction.reply("Please respond **yes** or **no**");
        return;
    }

    // Get object from db and remove from pending trades
    const id = pendingTrades.get(interaction.reference.messageId);
    pendingTrades.delete(interaction.reference.messageId);

    // Get object from db
    const tradeRef = await getDoc(doc(db, "trades", id));
    if (!tradeRef.exists()) {
        interaction.reply(
            "Trade does not exist or has already been completed! If this is unexpected behavior, please notify an admin."
        );
        return;
    }
    const trade = tradeRef.data();
    const { yours, theirs, youId, themId } = trade;

    // Make sure valid user trading
    if (interaction.author.id !== themId) {
        interaction.reply(
            "Only the person who the trade is with can accept or reject a trade!"
        );
        return;
    }

    // Get current person
    let youRef = await getDoc(doc(db, "people", youId));
    if (!youRef.exists()) {
        interaction.reply(
            "People who are not part of the house cannot trade (the other person is in the house)!"
        );
        return;
    }
    let you = youRef.data();

    // Get other person
    let themRef = await getDoc(doc(db, "people", themId));
    if (!themRef.exists()) {
        interaction.reply(
            "People who are not part of the house cannot trade (you are not in the house)!"
        );
        return;
    }
    let them = themRef.data();

    // If they said NO
    if (interaction.content.toLowerCase().indexOf("no") !== -1) {
        const yd = yours === "nothing" ? "[nothing]" : yours;
        const td = theirs === "nothing" ? "[nothing]" : theirs;

        // Notify the other person
        const youChannel = interaction.guild.channels.cache.get(
            you.notifChannel
        );
        await sendNotif(
            youChannel,
            youRef.id,
            newMessage(
                `${them.name} **rejected** your chore trade request`,
                `Your chore **${yd}** has **NOT** been traded for ${them.name}'s chore **${td}**`,
                0xb8e4ff
            )
        );

        // Notify you
        interaction.reply("Chore request rejected.");

        return;
    }

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
        interaction.reply(
            `The other person does not have a chore named **${yours}**!`
        );
        return;
    }
    const tc = them.chores.indexOf(theirs);
    if (theirs !== "nothing" && tc === -1) {
        interaction.reply(`You do not have a chore named **${theirs}**!`);
        return;
    }

    // Trade the chores!
    if (yours !== "nothing") {
        you.chores.splice(yc, 1);
        them.chores.push(yours);
    }
    if (theirs !== "nothing") {
        them.chores.splice(tc, 1);
        you.chores.push(theirs);
    }

    // Save people and delete trade
    const batch = writeBatch(db);
    batch.set(youRef.ref, you);
    batch.set(themRef.ref, them);
    batch.delete(tradeRef.ref);
    await batch.commit();

    const yd = yours === "nothing" ? "[nothing]" : yours;
    const td = theirs === "nothing" ? "[nothing]" : theirs;

    // Notify the other person
    const youChannel = interaction.guild.channels.cache.get(you.notifChannel);
    await sendNotif(
        youChannel,
        youRef.id,
        newMessage(
            `${them.name} finished a chore trade with you`,
            `Your chore **${yd}** has been traded for ${them.name}'s chore **${td}**`,
            0xb8e4ff
        )
    );

    // Notify you
    interaction.reply(
        `Your chore **${td}** has been traded for ${you.name}'s chore **${yd}**`
    );
}

module.exports = {
    loadTrading,
    acceptTrade,
    addPendingTrade,
};
