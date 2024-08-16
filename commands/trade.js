const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    setDoc,
    doc,
    getDoc,
    writeBatch,
} = require("firebase/firestore");
const { sendNotif, newMessage } = require("../src/notifications");

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

        // Trade the chores!
        if (yours !== "nothing") {
            you.chores.splice(yc, 1);
            them.chores.push(yours);
        }
        if (theirs !== "nothing") {
            them.chores.splice(tc, 1);
            you.chores.push(theirs);
        }

        // Save people
        const batch = writeBatch(db);
        batch.set(youRef.ref, you);
        batch.set(themRef.ref, them);
        await batch.commit();

        const yd = yours === "nothing" ? "[nothing]" : yours;
        const td = theirs === "nothing" ? "[nothing]" : theirs;

        // Notify other person
        const theirChannel = interaction.guild.channels.cache.get(
            them.notifChannel
        );
        await sendNotif(
            theirChannel,
            themRef.id,
            newMessage(
                `${you.name} traded a chore with you`,
                `Your chore **${td}** has been traded for ${you.name}'s chore **${yd}**`,
                0xb8e4ff,
                "chore-trade"
            )
        );

        interaction.reply({
            content: `Traded your chore **${yd}** with <@${themRef.id}>'s chore **${td}**`,
        });
    },
};
