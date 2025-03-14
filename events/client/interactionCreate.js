const { Events, MessageFlags } = require('discord.js');
const READ_ONLY_COMMANDS = ["balance", "mydeck", "view"];
const OPTIONAL_READ_ONLY_COMMANDS = ["upgrade", "wish"];

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		// check if a command is currently being confirmed
		if (interaction.client.confirmationState[interaction.user.id]) {
			const hasArguments = interaction.options.data && interaction.options.data.length > 0;
			// check if the new command is not read only
			if (!READ_ONLY_COMMANDS.includes(interaction.commandName) && (!OPTIONAL_READ_ONLY_COMMANDS.includes(interaction.commandName) || hasArguments)) {
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
