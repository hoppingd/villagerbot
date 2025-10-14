const { Events, MessageFlags } = require('discord.js');
const READ_ONLY_COMMANDS = ["balance", "claim", "help", "leaderboard", "deck", "decklist", "view"];
const OPTIONAL_READ_ONLY_COMMANDS = ["private", "shop", "storage", "upgrade", "wish"];
const OPTIONAL_READ_ONLY_SUBCOMMANDS = ["list", "server", "view"];
const constants = require('../../constants');
const { devId, altDevId } = require('../../config.json');
const MAINTENANCE_MODE = false; // change to true while bot is under maintenance

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;
		if (MAINTENANCE_MODE && !(interaction.user.id == devId || interaction.user.id == altDevId)) {
			try { return await interaction.reply({ content: 'Villager Bot is currently under maintenance. Please try again later.', flags: MessageFlags.Ephemeral }); } catch (error) { return; }
		}

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
		// check if the user is using commands too quickly
		const now = Date.now();
		if (interaction.client.cooldowns[interaction.user.id]) {
			const expirationTime = interaction.client.cooldowns[interaction.user.id] + constants.GLOBAL_COMMAND_COOLDOWN;
			if (now < expirationTime) {
				try { return await interaction.reply({ content: `You are using commands too quickly. Please slow down.`, flags: MessageFlags.Ephemeral }); } catch (error) { return; }
			}
		}
		interaction.client.cooldowns[interaction.user.id] = now;
		setTimeout(() => interaction.client.cooldowns.delete(interaction.user.id), constants.GLOBAL_COMMAND_COOLDOWN);
		// check if a command is currently being confirmed
		if (interaction.client.confirmationState[interaction.user.id]) {
			// check if the new command is not read only
			if (!READ_ONLY_COMMANDS.includes(interaction.commandName) && (!OPTIONAL_READ_ONLY_COMMANDS.includes(interaction.commandName) || !OPTIONAL_READ_ONLY_SUBCOMMANDS.includes(interaction.options.getSubcommand()))) {
				try {
					return await interaction.reply({
						content: 'You cannot use this command while in the middle of a key operation.',
						flags: MessageFlags.Ephemeral,
					});
				} catch (error) { return; }
			}
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
				}
			} catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
		}
	},
};
