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
const { reloadAllTasks } = require("./src/notifmain");
const { acceptTrade, loadTrading } = require("./src/trades");

async function main() {
    // Create a new client instance
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

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
        if (!settings.guild) {
            console.log("No guild set, ignoring notification system");
        } else {
            const guild = await client.guilds.fetch(settings.guild);
            if (guild) {
                reloadAllTasks(guild, db, settings);
            }
        }

        // Set up trading
        loadTrading(db);

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

    // Run command on message
    client.on("messageCreate", async (interaction) => {
        acceptTrade(db, settings, interaction);
    });
}

main();
