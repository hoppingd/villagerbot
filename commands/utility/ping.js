const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('pong'),
	async execute(interaction) {
		const ping = Date.now() - interaction.createdTimestamp;
		if (ping < 50) {
			await interaction.reply(`<:orville:1352918494051831860>: *"Hey, hey, hey! Looks like we got your message in just* ***${ping} ms!*** *Not bad!"*`);
		}
		else if (ping < 100) {
			await interaction.reply(`<:orville:1352918494051831860>: *"Do you copy? Ah, loud and clear! Looks like we heard from you in* ***${ping} ms***!"*`);
		}
		else if (ping < 200) {
			await interaction.reply(`<:orville:1352918494051831860>: *"Hmm... we're having a bit of trouble hearing you, but everything seems to be operational. We got your message in* ***${ping} ms****.`);
		}
		else if (ping < 500) {
			await interaction.reply(`<:orville:1352918494051831860>: *"H-hello?! Hello?! ...crackle... Ah, there you a-a-a ...static... Connection's looking a bit spotty at ...crackle...* ***${ping} ms*** *...bzzt... -thing alright over there?"*`);
		}
		else {
			await interaction.reply(`<:orville:1352918494051831860>: *"Can't hear-- ...bzzt... ...crackle... W-Wilbur? Is that y-y-y ...static...* ***${ping} ms***! *...crackle... -thing wrong?"*`);
		}
	},
};