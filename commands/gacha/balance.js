const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Shows the user's Bell balance.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            await interaction.reply(`You have **${profileData.bells}** <:bells:1349182767958855853>.`)
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error checking the user's balance.`);
        }
    },
};