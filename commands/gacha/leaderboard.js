const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const { calculatePoints } = require('../../util');
const constants = require('../../constants');

const PAGE_SIZE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription("Shows the character leaderboards.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const result = await charModel.aggregate([
                { $sort: { numClaims: -1, name: 1 } }, // Sort characters by numClaims in descending order, then sort alphabetically
                { $project: { name: 1, numClaims: 1 } },    // Return both name and numClaims
            ]);

            let replyMessage = "";
            for (let i = 0; i < PAGE_SIZE; i++) {
                const points = await calculatePoints(result[i].numClaims, constants.RARITY_NUMS.COMMON);
                replyMessage += `#${i + 1}. ${result[i].name} - **${points}** <:bells:1349182767958855853>\n`;
            }
            // make the message look nice
            const leaderboard = new EmbedBuilder()
                .setTitle("CHARACTER LEADERBOARD")
                .setDescription(replyMessage)
                .setFooter({ text: `Page 1/${Math.floor(constants.NUM_VILLAGERS / PAGE_SIZE + 1)}.` });
            const left = new ButtonBuilder()
                .setCustomId('left')
                .setLabel('Previous Page')
                .setStyle(ButtonStyle.Primary);
            const right = new ButtonBuilder()
                .setCustomId('right')
                .setLabel('Next Page')
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder()
                .addComponents(left, right);
            const reply = await interaction.reply({
                embeds: [leaderboard],
                components: [row],
                withResponse: true,
            });

            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.ROLL_CLAIM_TIME_LIMIT });

            let page = 0;
            collector.on('collect', async i => {
                i.deferUpdate();
                if (i.customId == 'left') page -= 1;
                if (i.customId == 'right') page += 1;
                replyMessage = "";
                if (page < 0) page = Math.floor(constants.NUM_VILLAGERS / PAGE_SIZE);
                if (page > Math.floor(constants.NUM_VILLAGERS / PAGE_SIZE)) page = 0;
                const start = PAGE_SIZE * page;
                for (let idx = start; idx < start + PAGE_SIZE; idx++) {
                    if (idx >= constants.NUM_VILLAGERS) break;
                    const points = await calculatePoints(result[idx].numClaims, constants.RARITY_NUMS.COMMON);
                    replyMessage += `#${idx + 1}. ${result[idx].name} - **${points}** <:bells:1349182767958855853>\n`;
                }
                leaderboard.setDescription(replyMessage);
                leaderboard.setFooter({ text: `Page ${page + 1}/${Math.floor(constants.NUM_VILLAGERS / PAGE_SIZE + 1)}.` });
                await interaction.editReply({
                    embeds: [leaderboard],
                    components: [row],
                });
            });

            collector.on('end', async end => {
                left.setDisabled(true);
                right.setDisabled(true);
                await interaction.editReply({
                    embeds: [leaderboard],
                    components: [row],
                });
            });

        } catch (err) {
            console.log(err);
            try {
                if (interaction.replied) await interaction.followUp(`There was an error displaying the leaderboard: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
                else await interaction.reply(`There was an error displaying the leaderboard: ${err.name}. Please report bugs [here](https://discord.gg/RDqSXdHpay).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server.") }
        }
    },
};