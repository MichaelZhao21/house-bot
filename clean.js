const { REST, Routes } = require("discord.js");
const config = require("./config.json");

const rest = new REST().setToken(config.discordToken);

const isGuild = process.argv.length > 2 && process.argv[2] === "guild";

const route = isGuild
    ? Routes.applicationGuildCommands(
          config.discordClientId,
          config.discordGuildId
      )
    : Routes.applicationCommands(config.discordClientId);

rest.put(route, { body: [] })
    .then(() =>
        console.log(
            `Successfully deleted all ${
                isGuild ? "guild " : ""
            }application commands`
        )
    )
    .catch(console.error);
