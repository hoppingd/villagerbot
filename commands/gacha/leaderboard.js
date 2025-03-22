const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const { calculatePoints } = require('../../util');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription("Shows the character leaderboards.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const result = await charModel.aggregate([
                { $sort: { numClaims: -1 } }, // Sort characters by numClaims in descending order
                { $project: { name: 1, numClaims: 1} },    // Return both name and numClaims
            ]);

            let replyMessage = "";
            for (let i = 0; i < 10; i++) {
                const points = await calculatePoints(result[i].numClaims, constants.RARITY_NUMS.COMMON);
                replyMessage += `#${i+1}. ${result[i].name} - **${points}** <:bells:1349182767958855853>\n`;
            }
            // make the message look nice
            const deckEmbed = new EmbedBuilder()
                .setTitle("TOP 10 CHARACTERS")
                .setDescription(replyMessage)
                .setFooter({ text: `Bell Values are calculated based on a character's total claims across all servers.` });
            await interaction.reply({
                embeds: [deckEmbed]
            });
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error displaying the leaderboard.`);
        }
    },
};