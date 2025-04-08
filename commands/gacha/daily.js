const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile, getTimeString } = require('../../util');
const baseMax = 200;
const baseMin = 20;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription("Recieve daily bells from the Bank of Nook. (NOOK I REQUIRED")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const nookTier = profileData.nookTier;
            // check the nook level
            if (nookTier == 0) return await interaction.reply(`You must purchase the upgrade <:tom_nook:1349263649356779562> **Nook I** to use this command.`);
            // check the timer
            const currDate = Date.now();
            const timeSinceDailyBells = currDate - profileData.dailyBellsTimestamp;
            if (timeSinceDailyBells < constants.DAY) {
                const timeRemaining = constants.DAY - timeSinceDailyBells;
                return await interaction.reply(`<:tom_nook:1349263649356779562>: *"You already visited the Bank of Nook today, ${interaction.user}. Come back in ${getTimeString(timeRemaining)}, hm?*`);
            }
            // recieve daily bells
            const bells = Math.floor(Math.random() * (baseMax*nookTier - baseMin*nookTier + 1)) + baseMin*nookTier;
            profileData.bells += bells;
            let newDate = new Date(currDate);
            newDate.setHours(0);
            newDate.setMinutes(0);
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
            profileData.dailyBellsTimestamp = newDate;
            await profileData.save();
            return await interaction.reply(`<:tom_nook:1349263649356779562>: *"Here is a gift of **${bells}** <:bells:1349182767958855853> from the Bank of Nook, ${interaction.user}. This is acceptable, yes?"*`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error recieving daily bells: ${err.name}. Please report bugs [here](https://discord.gg/RDqSXdHpay).`);
        }
    },
};