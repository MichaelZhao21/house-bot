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
        .setName("recycling")
        .setDescription(
            "Report that the recycling is full, will send notif to next person in recycling rotation."
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
            where("number", "==", settings.recyclingNum),
            limit(1)
        );
        const userRef = (await getDocs(q)).docs[0];
        const user = userRef.data();

        settings.recyclingNum = (settings.recyclingNum + 1) % settings.total;
        user.chores.push("recycling");

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
                "Please take out the recycling",
                "Do this ASAP or if unable please notify someone else to do it.",
                0x5e80a8,
            )
        );

        interaction.reply("Notification for taking out the recycling has been sent!");
    },
};
