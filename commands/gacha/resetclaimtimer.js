const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');
const DAY = 24 * 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetclaimtimer')
        .setDescription("Refreshes the user's claim timer. (ISABELLE V REQUIRED)")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            if (profileData.isaTier != constants.UPGRADE_COSTS.length) return await interaction.reply(`You must purchase the upgrade **Isabelle ${constants.ROMAN_NUMERALS[constants.UPGRADE_COSTS.length]}** to use this command.`);
            // check the timer
            const currDate = Date.now();
            const timeSinceResetClaim = currDate - profileData.resetClaimTimestamp;
            if (timeSinceResetClaim < DAY) {
                const timeRemaining = DAY - timeSinceResetClaim;
                let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
                let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
                if (minutesRemaining == 60) {
                    hoursRemaining += 1;
                    minutesRemaining = 0;
                }
                let timeString = "";
                if (hoursRemaining > 0) timeString += `**${hoursRemaining} hours** and `;
                timeString += `**${minutesRemaining} minutes**`;
                return await interaction.reply(`<:isabelle:1349263650191315034>: *"Alrighty, ${interaction.user}! Let me just... Wait a sec, you already came in today! Come back in ${timeString}.*`);
            }
            let timeSinceClaim = Date.now() - profileData.claimTimestamp;
            // if user's claim is available
            if (timeSinceClaim >= constants.DEFAULT_CLAIM_TIMER) return await interaction.reply(`<:isabelle:1349263650191315034>: *"Your claim is still up, silly! Come back after you've claimed a card, ${interaction.user}."*`);
            // the user's claim is down. we can reset their claim timer
            profileData.claimTimestamp = new Date(0);
            let newDate = new Date(currDate);
            newDate.setHours(0);
            newDate.setMinutes(0);
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
            profileData.resetClaimTimestamp = newDate;
            await profileData.save();
            await interaction.reply(`<:isabelle:1349263650191315034>: *"Alrighty, ${interaction.user}! Let me just make a quick call to out mutual friend <:resetti:1349263941179674645> and... yup, looks like you're all set. You should be able to claim another card now!"*`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error setting the deck name.`);
        }
    },
};