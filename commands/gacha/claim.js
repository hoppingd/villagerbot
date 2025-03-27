const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile, getTimeString } = require('../../util');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription("Check if you can claim.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            let timeSinceClaim = Date.now() - profileData.claimTimestamp;
            // if user's claim isn't available
            if (timeSinceClaim < constants.DEFAULT_CLAIM_TIMER) {
                let timeRemaining = constants.DEFAULT_CLAIM_TIMER - timeSinceClaim;
                return await interaction.reply(`${interaction.user}, you claimed a card recently. You must wait ${getTimeString(timeRemaining)} before claiming again.`);
            }
            return await interaction.reply(`${interaction.user}, you are currently able to claim a card!`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error checking if the user can claim.`);
        }
    },
};