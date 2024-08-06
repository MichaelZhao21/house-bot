const path = require("node:path");
const fs = require("fs");
const { REST, Routes } = require("discord.js");
const config = require("./config.json");

// Load all da commands
const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discordToken);

const isGuild = process.argv.length > 2 && process.argv[2] === "guild";

const route = isGuild
    ? Routes.applicationGuildCommands(
          config.discordClientId,
          config.discordGuildId
      )
    : Routes.applicationCommands(config.discordClientId);

// Deploy commands
(async () => {
    try {
        console.log(
            `Started refreshing ${commands.length} ${
                isGuild ? "guild " : ""
            }application (/) commands.`
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(route, { body: commands });

        console.log(
            `Successfully reloaded ${data.length} ${
                isGuild ? "guild " : ""
            }application (/) commands.`
        );
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
