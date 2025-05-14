# House Bot

This is a bot used for my house! It takes care of rent, chores, events, and notifications!

## Setup

Create a [firebase project](https://firebase.google.com/docs/web/setup#create-firebase-project-and-app) and save the config/tokens in a `config.json` file in the project root. It should look something like this:

```
{
  "apiKey": "",
  "authDomain": "",
  "projectId": "",
  "storageBucket": "",
  "messagingSenderId": "",
  "appId": "",
  "measurementId": ""
}
```

Create a Discord app/bot, generate a token, and add a field "discordToken" with that generated token as the value.

## Execution

```
npm run start
```

# Disabling Strikes

The strike system can be disabled (and is in the repo right now) in the 2 files: `src/chores.js` and `src/rent.js`. At the top of the page, change the `DISABLED_STRIKES` constant to `true`. If you would like to re-enable the strike system, change that constant to `false`.
