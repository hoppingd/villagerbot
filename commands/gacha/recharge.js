const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile, getRechargeDate, getTimeString } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recharge')
        .setDescription("Replenishes the user's energy. (BREWSTER V REQUIRED)")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            if (profileData.brewTier != constants.UPGRADE_COSTS.length) return await interaction.reply(`You must purchase the upgrade <:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[constants.UPGRADE_COSTS.length]}** to use this command.`);
            // check the timer
            const currDate = Date.now();
            const timeSinceRecharge = currDate - profileData.rechargeCommandTimestamp;
            if (timeSinceRecharge < constants.DAY) {
                const timeRemaining = constants.DAY - timeSinceRecharge;
                return await interaction.reply(`<:brewster:1349263645380710431>: *"Sorry, ${interaction.user}. I'm all out of coffee. Come back in ${getTimeString(timeRemaining)}."*`);
            }
            // check if the user can roll
            let timeSinceReset = Date.now() - profileData.rechargeTimestamp;
            if (timeSinceReset >= constants.DEFAULT_ROLL_TIMER) {
                // replenish the rolls if the roll timer has passed
                profileData.rechargeTimestamp = getRechargeDate();
                profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
                await profileData.save();
            }
            if (profileData.energy > 0) return await interaction.reply(`<:brewster:1349263645380710431>: *"You've still got* ***${profileData.energy}*** *energy left, ${interaction.user}. Come back when you're all out, and I'll have a fresh brew waiting for you."*`);
            // the user has 0 energy and their timer is up. we can reset their roll timer
            profileData.rechargeTimestamp = new Date(0);
            let newDate = new Date(currDate);
            newDate.setHours(0);
            newDate.setMinutes(0);
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
            profileData.rechargeCommandTimestamp = newDate;
            profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
            await profileData.save();
            await interaction.reply(`<:brewster:1349263645380710431>: *"All right then, before it gets cold... One fresh brewed cup... Enjoy, ${interaction.user}."*`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error recharging: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
        }
    },
};