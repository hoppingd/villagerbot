const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');
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
                let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
                let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
                let timeString = "";
                if (hoursRemaining > 0) timeString += `**${hoursRemaining} hours** and `;
                timeString += `**${minutesRemaining} minutes**`;
                return await interaction.reply(`${interaction.user}, you claimed a card recently. You must wait ${timeString} before claiming again.`);
            }
            return await interaction.reply(`${interaction.user}, you are currently able to claim a card!`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error checking if the user can claim.`);
        }
    },
};