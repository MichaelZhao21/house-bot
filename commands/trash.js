const { SlashCommandBuilder, CommandInteraction } = require("discord.js");
const {
    Firestore,
    query,
    collection,
    where,
    writeBatch,
    doc,
    limit,
    getDocs,
} = require("firebase/firestore");
const { sendNotif, newMessage } = require("../src/notifications");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("trash")
        .setDescription(
            "Report that the trash is full, will send notif to next person in trash rotation."
        ),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     * @param {Object} settings
     */
    async execute(interaction, db, settings) {
        // Find user who has curr trash number
        const q = query(
            collection(db, "people"),
            where("number", "==", settings.trashNum),
            limit(1)
        );
        const userRef = (await getDocs(q)).docs[0];
        const user = userRef.data();

        settings.trashNum = (settings.trashNum + 1) % settings.total;
        user.chores.push("trash");

        // Update db
        const batch = writeBatch(db);
        batch.set(doc(db, "settings", "0"), settings);
        batch.set(userRef.ref, user);
        await batch.commit();

        // Send notif
        const channel = interaction.guild.channels.cache.get(user.notifChannel);
        await sendNotif(
            channel,
            userRef.id,
            newMessage(
                "Please take out the trash",
                "Do this ASAP or if unable please notify someone else to do it.",
                0xada163,
            )
        );

        interaction.reply("Notification for taking out the trash has been sent!");
    },
};
