const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    ActivityType,
} = require("discord.js");
const config = require("./config.json");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc } = require("firebase/firestore");
const path = require("node:path");
const fs = require("fs");
const { startRentTimer, setAlarm } = require("./src/notifications");
const dayjs = require("dayjs");
const { cleanAndGetEvents, setEventAlarm } = require("./src/events");

async function main() {
    // Create a new client instance
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    // Load firestore instance
    const app = initializeApp(config);
    const db = getFirestore(app);

    // Get the settings data or create if doesn't exist
    let settings;
    const settingsDoc = doc(db, "settings", "0");
    const settingsRef = await getDoc(settingsDoc);
    if (settingsRef.exists()) {
        settings = settingsRef.data();
    } else {
        settings = {
            notifChannel: null,
            guild: null,
            notifs: [],
            utilities: 0,
            rentStart: 0,
            rentEnd: 0,
        };
        await setDoc(settingsDoc, settings);
    }

    // Run once app loads
    client.once(Events.ClientReady, async (readyClient) => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);

        // Then clean up and set notifications
        const guild = await client.guilds.fetch(settings.guild);
        if (guild) {
            // Get the main notif channel
            const channel = await guild.channels.fetch(settings.notifChannel);

            // Start the events timers
            const events = await cleanAndGetEvents(db);
            events.forEach((event) => setEventAlarm(event, channel));

            // Calculate next rent notif interval
            const now = dayjs();
            let month = now.month();
            let year = now.year();
            const day = now.date();

            // Start rent timer
            if (day < 25) {
                startRentTimer(db, month, year, true, settings, channel);
            } else if (day < 28) {
                startRentTimer(db, month, year, false, settings, channel);
            } else {
                if (month === 11) {
                    month = 0;
                    year++;
                } else {
                    month++;
                }
                startRentTimer(db, month, year, true, settings, channel);
            }
        }

        console.log("Notification system ready!");

        // Set presence message
        client.user.setPresence({
            activities: [{ name: "/help", type: ActivityType.Listening }],
        });
    });

    // Log into Discord
    client.login(config.discordToken);

    // Load commands
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    }

    // Run command on user command invoke
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(
            interaction.commandName
        );
        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`
            );
            return;
        }

        try {
            await command.execute(interaction, db, settings);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                });
            }
        }
    });
}

main();
