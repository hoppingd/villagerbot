const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile, getRechargeDate, getTimeString } = require('../../util');
const { topggToken, botId } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription("Replenishes the user's energy if they have voted.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            // check if the user can roll
            let timeSinceReset = Date.now() - profileData.rechargeTimestamp;
            if (timeSinceReset >= constants.DEFAULT_ROLL_TIMER) {
                // replenish the rolls if the roll timer has passed
                profileData.rechargeTimestamp = getRechargeDate();
                profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
                await profileData.save();
            }
            if (profileData.energy > 0) return await interaction.reply(`<:rover:1354073182629400667>: *"You still have* ***${profileData.energy}*** *energy left, ${interaction.user}. Try this command again when you're all out."*`);
            // check if the user has voted
            const hasVoted = await checkIfUserVoted(`https://top.gg/api/bots/${botId}/check?userId=${interaction.user.id}`);
            // if there was a network error, it's likely because the user hasn't linked Discord to top.gg
            if (hasVoted == 2) {
                return await interaction.reply(`<:rover:1354073182629400667>: *"Visit [our page](https://top.gg/bot/1348066482067603456) on Top.gg to vote."*`)
            }
            // the user exists, but they haven't voted yet
            if (!hasVoted) {
                return await interaction.reply(`<:rover:1354073182629400667>: *"You haven't voted yet. Visit [our page](https://top.gg/bot/1348066482067603456) on Top.gg to vote."*.`);
            }
            // check if the user already used the command in the last 12h
            const currDate = Date.now();
            const timeSinceVote = currDate - profileData.lastSuccessfulVote;
            if (timeSinceVote < constants.HALF_DAY) {
                const timeRemaining = constants.HALF_DAY - timeSinceVote;
                return await interaction.reply(`<:rover:1354073182629400667>: *"You already used* ***/vote*** *in the last 12 hours. Try again in ${getTimeString(timeRemaining)}."*`);
            }
            // the user has 0 energy, has voted, and their timer is up. we can reset their roll timer
            let newDate = new Date(currDate);
            profileData.lastSuccessfulVote = newDate;
            profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
            await profileData.save();
            await interaction.reply(`<:rover:1354073182629400667>: *"Thanks for voting, ${interaction.user}! I replenished your energy for you."*`);
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with **/vote**: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};

async function checkIfUserVoted(apiUrl) {
    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                'Authorization': topggToken,
            },
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        return data.voted;
    } catch (error) {
        console.error('Error:', error);
        return 2;
    }
}