const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearname')
        .setDescription("Restores the name of the user's deck to its default value.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            // if necessary, set deckName to null
            if (profileData.deckName != null) {
                profileData.deckName = null;
                await profileData.save();
            }
            await interaction.reply({
                content: `<:resetti:1349263941179674645>: *"${interaction.user}, yer deck name's been reset! Pleasure doin' business with ya!"*`,
            })
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error resetting the deck name.`);
        }
    },
};