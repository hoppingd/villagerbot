const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token, mongodbSRV } = require('./config.json');
const mongoose = require('mongoose');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages]});

client.commands = new Collection();
const commandFoldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandFoldersPath);

client.confirmationState = new Collection(); // tracks if the user is in the middle of an important command
client.cooldowns = new Collection();
client.activeShops = new Collection(); // tracks if a shop is being accessed
client.recipientState = new Collection(); // tracks if the user is being traded with or gifted to

// dynamically load slash commands
for (const folder of commandFolders) {
	const commandsPath = path.join(commandFoldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			console.log("loaded command: ", command.data.name);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventFoldersPath = path.join(__dirname, 'events');
const eventFolders = fs.readdirSync(eventFoldersPath);

// dynamically load events
for (const folder of eventFolders) {
	const eventsPath = path.join(eventFoldersPath, folder);
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
		console.log("loaded event: ", event.name);
	}
}

mongoose.connect(mongodbSRV).then(() => {
	console.log('Connected to the database!');
}).catch((err) => {
	console.log(err);
});

client.login(token);
