const { Events, MessageFlags } = require('discord.js');
const READ_ONLY_COMMANDS = ["balance", "claim", "leaderboard", "deck", "view"];
const OPTIONAL_READ_ONLY_COMMANDS = ["upgrade", "wish"];
const OPTIONAL_READ_ONLY_SUBCOMMANDS = ["view"];
const GLOBAL_COMMAND_COOLDOWN = 1000; // 1 second

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
		// check if the user is using commands too quickly
		const now = Date.now();
		if (interaction.client.cooldowns[interaction.user.id]) {
			const expirationTime = interaction.client.cooldowns[interaction.user.id] + GLOBAL_COMMAND_COOLDOWN;
			if (now < expirationTime) {
				return interaction.reply({ content: `You are using commands too quickly. Please slow down.`, flags: MessageFlags.Ephemeral });
			}
		}
		interaction.client.cooldowns[interaction.user.id] = now;
		setTimeout(() => interaction.client.cooldowns.delete(interaction.user.id), GLOBAL_COMMAND_COOLDOWN);
		// check if a command is currently being confirmed
		if (interaction.client.confirmationState[interaction.user.id]) {
			const subCommand = interaction.options.getSubcommand();
			// check if the new command is not read only
			if (!READ_ONLY_COMMANDS.includes(interaction.commandName) && (!OPTIONAL_READ_ONLY_COMMANDS.includes(interaction.commandName) || !OPTIONAL_READ_ONLY_SUBCOMMANDS.includes(subCommand))) {
				return interaction.reply({
					content: 'You cannot use this command while awaiting confirmation on another key operation.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	},
};
