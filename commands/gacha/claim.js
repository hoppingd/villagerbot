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
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const displayResetTimer = profileData.isaTier == constants.UPGRADE_COSTS.length;
            // resetclaimtimer info
            const currDate = Date.now();
            const timeSinceResetClaim = currDate - profileData.resetClaimTimestamp;
            // check the timer
            let timeSinceClaim = Date.now() - profileData.claimTimestamp;
            let replyMessage = "";
            // if user's claim isn't available
            if (timeSinceClaim < constants.DEFAULT_CLAIM_TIMER) {
                let timeRemaining = constants.DEFAULT_CLAIM_TIMER - timeSinceClaim;
                replyMessage += `${interaction.user}, you claimed a card recently. You must wait ${getTimeString(timeRemaining)} before claiming again.`;
                // if resetclaimtimer is unlocked
                if (displayResetTimer) {
                    // if resetclaimtimer is on cooldown
                    if (timeSinceResetClaim < constants.DAY) {
                        const resetTimeRemaining = constants.DAY - timeSinceResetClaim;
                        replyMessage += ` You can reset your claim in ${getTimeString(resetTimeRemaining)}.`;
                    }
                    else {
                        replyMessage += ` You can currently reset your claim.`;
                    }
                }
                return await interaction.reply(replyMessage);
            }
            replyMessage += `${interaction.user}, you are currently able to claim a card!`;
            // if resetclaimtimer is unlocked
            if (displayResetTimer) {
                // if resetclaimtimer is on cooldown
                if (timeSinceResetClaim < constants.DAY) {
                    const resetTimeRemaining = constants.DAY - timeSinceResetClaim;
                    replyMessage += ` You can reset your claim in ${getTimeString(resetTimeRemaining)}.`;
                }
                else {
                    replyMessage += ` You can currently reset your claim.`;
                }
            }
            return await interaction.reply(replyMessage);
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error checking if the user can claim: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};