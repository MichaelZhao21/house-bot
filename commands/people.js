const {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
} = require("discord.js");
const { Firestore, getDocs, collection } = require("firebase/firestore");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("people")
        .setDescription("Shows a list of everyone in the house"),

    /**
     * Execution script
     * @param {CommandInteraction} interaction
     * @param {Firestore} db
     */
    async execute(interaction, db) {
        // Get all users
        const users = (await getDocs(collection(db, "people"))).docs.map(
            (doc) => doc.data()
        );
        if (!users) {
            interaction.reply("Unable to retrieve users");
            return;
        }

        const fix = (a) => a.replace("_", "\\_");

        const thisWeek = dayjs().day(0);

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xe0b5f5)
            .setTitle("House Members")
            .setThumbnail(
                "https://upload.wikimedia.org/wikipedia/en/1/14/HouseCastSeason1.jpg"
            )
            .addFields(
                users.map((u) => ({
                    name: u.name,
                    value: `username: ${fix(u.username)}\n- base rent: $${
                        u.rent ?? 0
                    }\n- chores left: ${u.chores.join(
                        ", "
                    )}\n- extra chores done: ${
                        u.extraChores
                    }\n- vacations: ${u.vacations.filter(
                        (v) =>
                            !dayjs(v, "MM-DD-YYYY").isBefore(thisWeek, "date")
                    )}\n- strikes: ${u.strikes}`,
                }))
            );

        interaction.reply({ embeds: [embed] });
    },
};
