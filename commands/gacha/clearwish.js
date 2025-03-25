const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwish')
        .setDescription("Clears the user's wish.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            // if necessary, set wish to null
            if (profileData.wish != null) {
                profileData.wish = null;
                await profileData.save();
            }
            await interaction.reply({
                content: `<:celeste:1349263647121346662>: *"${interaction.user}, you are no longer wishing for any card!"*`,
            })
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error clearing the user's wish.`);
        }
    },
};