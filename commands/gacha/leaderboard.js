const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const profileModel = require('../../models/profileSchema');
const shopModel = require('../../models/shopSchema');
const serverDataModel = require('../../models/serverDataSchema');
const { calculatePoints, escapeMarkdown, fetchGuildName, fetchUsername, getLevelRankEmoji, getOrCreateShop } = require('../../util');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');

const PAGE_SIZE = 10;
const MAX_OWNER_ENTRIES = 100;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription("Displays a leaderboard.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('donations')
                .setDescription('Show leaderboards related to donations.')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Show the top servers (global) or the top donors in this server (server).')
                        .addChoices(
                            { name: "global", value: "g" },
                            { name: "server", value: "s" },
                        )
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('level')
                .setDescription('Show the cards with the highest level across all decks.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ownerrank')
                .setDescription('See the owners with the highest level on a specified character.')
                .addStringOption(option =>
                    option.setName('character')
                        .setRequired(true)
                        .setDescription('The character to view.')
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('value')
                .setDescription('Show the cards with the highest value.'))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            // DONATIONS SUBCOMMAND
            if (subCommand == "donations") {
                const type = interaction.options.getString('type');
                // GLOBAL LEADERBOARD
                if (type == "g") {
                    // query
                    const result = await serverDataModel.aggregate([
                        // First match non-private servers
                        { $match: { isPrivate: false } },
                        // Join with shop data using serverID
                        {
                            $lookup: {
                                from: 'shopmodels',
                                localField: 'serverID',
                                foreignField: 'serverID',
                                as: 'shopData'
                            }
                        },
                        // Unwind the shopData array (should have exactly one element)
                        { $unwind: '$shopData' },
                        // Filter out servers with 0 donations
                        {
                            $match: {
                                'shopData.totalDonations': { $gt: 0 }
                            }
                        },
                        // Project only the fields we need
                        {
                            $project: {
                                serverID: 1,
                                totalDonations: '$shopData.totalDonations',
                                reddTier: '$shopData.reddTier'  // <-- add this
                            }
                        },
                        // Sort by totalDonations in descending order (highest first)
                        { $sort: { totalDonations: -1 } }
                    ]);
                    if (result.length > 0) {
                        let replyMessage = "";
                        for (let i = 0; i < result.length && i < PAGE_SIZE; i++) {
                            let serverName = await fetchGuildName(interaction.client, result[i].serverID);
                            let reddTierDisplay = "";
                            if (result[i].reddTier > 0) {
                                reddTierDisplay = `, <:redd:1354073677318062153> **${constants.REDD_NUMERALS[result[i].reddTier - 1]}**`;
                            }
                            replyMessage += `#${i + 1}. ${escapeMarkdown(serverName)} - **${result[i].totalDonations}** <:bells:1349182767958855853>${reddTierDisplay}\n`;
                        }

                        const total_pages = Math.ceil(result.length / PAGE_SIZE);

                        // make the message look nice
                        const leaderboard = new EmbedBuilder()
                            .setTitle("Donations Leaderboard (Global)")
                            .setDescription(replyMessage)
                            .setFooter({ text: `Page 1/${total_pages}.` });
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
                            try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                            if (i.customId == 'left') page -= 1;
                            if (i.customId == 'right') page += 1;
                            replyMessage = "";
                            if (page < 0) page = total_pages - 1;
                            if (page >= total_pages) page = 0;
                            const start = PAGE_SIZE * page;
                            for (let idx = start; idx < start + PAGE_SIZE && idx < result.length; idx++) {
                                let serverName = await fetchGuildName(interaction.client, result[idx].serverID);
                                let reddTierDisplay = "";
                                if (result[idx].reddTier > 0) {
                                    reddTierDisplay = `, <:redd:1354073677318062153> **${constants.REDD_NUMERALS[result[idx].reddTier - 1]}**`;
                                }
                                replyMessage += `#${idx + 1}. ${escapeMarkdown(serverName)} - **${result[idx].totalDonations}** <:bells:1349182767958855853>${reddTierDisplay}\n`;
                            }
                            leaderboard.setDescription(replyMessage);
                            leaderboard.setFooter({ text: `Page ${page + 1}/${total_pages}.` });
                            try {
                                await interaction.editReply({
                                    embeds: [leaderboard],
                                    components: [row],
                                });
                            } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                        });

                        collector.on('end', async end => {
                            left.setDisabled(true);
                            right.setDisabled(true);
                            try {
                                await interaction.editReply({
                                    embeds: [leaderboard],
                                    components: [row],
                                });
                            } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                        });
                    }
                    else {
                        return await interaction.reply(`There are no servers on the leaderboard. Donate to be the first (your server must be made public with **/toggle serverprivacy**).`);
                    }

                }
                // SERVER LEADERBOARD
                else {
                    const shopData = await getOrCreateShop(interaction.guildId);
                    const topDonors = shopData.donors.sort((a, b) => b.amount - a.amount);

                    if (topDonors.length > 0) {
                        let replyMessage = "";
                        for (let i = 0; i < topDonors.length && i < PAGE_SIZE; i++) {
                            let username = await fetchUsername(interaction.client, topDonors[i].userID);
                            replyMessage += `#${i + 1}. ${escapeMarkdown(username)} - **${topDonors[i].amount}** <:bells:1349182767958855853>\n`;
                        }

                        const total_pages = Math.ceil(topDonors.length / PAGE_SIZE);

                        // make the message look nice
                        const leaderboard = new EmbedBuilder()
                            .setTitle("Donations Leaderboard (Server)")
                            .setDescription(replyMessage)
                            .setFooter({ text: `Page 1/${total_pages}.` });
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
                            try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                            if (i.customId == 'left') page -= 1;
                            if (i.customId == 'right') page += 1;
                            replyMessage = "";
                            if (page < 0) page = total_pages - 1;
                            if (page >= total_pages) page = 0;
                            const start = PAGE_SIZE * page;
                            for (let idx = start; idx < start + PAGE_SIZE && idx < topDonors.length; idx++) {
                                let username = await fetchUsername(interaction.client, topDonors[idx].userID);
                                replyMessage += `#${idx + 1}. ${escapeMarkdown(username)} - **${topDonors[idx].amount}** <:bells:1349182767958855853>\n`;
                            }
                            leaderboard.setDescription(replyMessage);
                            leaderboard.setFooter({ text: `Page ${page + 1}/${total_pages}.` });
                            try {
                                await interaction.editReply({
                                    embeds: [leaderboard],
                                    components: [row],
                                });
                            } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                        });

                        collector.on('end', async end => {
                            left.setDisabled(true);
                            right.setDisabled(true);
                            try {
                                await interaction.editReply({
                                    embeds: [leaderboard],
                                    components: [row],
                                });
                            } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                        });
                    }
                    else {
                        return await interaction.reply(`No server members have donated yet. Use **/shop donate [amount]** to donate.`);
                    }
                }
            }
            // OWNERRANK SUBCOMMAND
            else if (subCommand == "ownerrank") {
                const character = interaction.options.getString('character');
                const normalizedCardName = character.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "");
                const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName);

                if (!villager) return interaction.reply(`No card named **${character}** found. Check your spelling.`);

                const result = await profileModel.aggregate([
                    { $match: { isPrivate: false } },
                    { $unwind: "$cards" },
                    { $match: { "cards.name": villager.name } },
                    { $project: { userID: 1, level: "$cards.level" } },
                    { $sort: { level: -1 } },
                    { $limit: MAX_OWNER_ENTRIES }
                ]);

                if (result.length === 0)
                    return interaction.reply(`No **${villager.name}** owners were found. Become the first by using **/roll**!`);

                // precompute ranks
                let prevLevel = null;
                let rankCounter = 0;
                let displayRank = 0;

                for (let i = 0; i < result.length; i++) {
                    const level = result[i].level;
                    rankCounter++;

                    if (level != prevLevel) displayRank = rankCounter;
                    prevLevel = level;

                    result[i].rank = displayRank; // store absolute rank
                }

                let replyMessage = "";
                for (let i = 0; i < result.length && i < PAGE_SIZE; i++) {
                    let username = await fetchUsername(interaction.client, result[i].userID);
                    replyMessage += `${getLevelRankEmoji(result[i].rank)}  #${result[i].rank}. ${escapeMarkdown(username)} - **${result[i].level}** <:love:1352200821072199732>\n`;
                }

                const total_pages = Math.ceil(result.length / PAGE_SIZE);

                // make the message look nice
                const leaderboard = new EmbedBuilder()
                    .setTitle(`Top ${villager.name} Owners`)
                    .setDescription(replyMessage)
                    .setFooter({ text: `Page 1/${total_pages}.` });
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
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.customId == 'left') page -= 1;
                    if (i.customId == 'right') page += 1;
                    replyMessage = "";
                    if (page < 0) page = total_pages - 1;
                    if (page >= total_pages) page = 0;
                    const start = PAGE_SIZE * page;
                    for (let idx = start; idx < start + PAGE_SIZE && idx < result.length; idx++) {
                        let username = await fetchUsername(interaction.client, result[idx].userID);
                        replyMessage += `${getLevelRankEmoji(result[idx].rank)} #${result[idx].rank}. ${escapeMarkdown(username)} - **${result[idx].level}** <:love:1352200821072199732>\n`;
                    }
                    leaderboard.setDescription(replyMessage);
                    leaderboard.setFooter({ text: `Page ${page + 1}/${total_pages}.` });
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });

                collector.on('end', async end => {
                    left.setDisabled(true);
                    right.setDisabled(true);
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });
            }
            // LEVEL SUBCOMMAND
            else if (subCommand == "level") {
                // query
                const result = await profileModel.aggregate([
                    { $unwind: "$cards" }, // Flatten cards array
                    {
                        $group: {
                            _id: "$cards.name",
                            totalLevel: { $sum: "$cards.level" }
                        }
                    },
                    { $sort: { totalLevel: -1 } },
                    {
                        $project: {
                            _id: 0,
                            name: "$_id",
                            totalLevel: 1
                        }
                    }
                ]);

                // add unleveled cards
                const existingNames = new Set(result.map(r => r.name));
                const allChars = await charModel.find({}, { name: 1, _id: 0 });
                for (const char of allChars) {
                    if (!existingNames.has(char.name)) {
                        result.push({
                            name: char.name,
                            totalLevel: 0
                        });
                    }
                }

                let replyMessage = "";
                for (let i = 0; i < PAGE_SIZE; i++) {
                    replyMessage += `#${i + 1}. ${result[i].name} - **${result[i].totalLevel}** <:love:1352200821072199732>\n`;
                }

                const total_pages = Math.ceil(constants.NUM_VILLAGERS / PAGE_SIZE);

                // make the message look nice
                const leaderboard = new EmbedBuilder()
                    .setTitle("Most Leveled Cards")
                    .setDescription(replyMessage)
                    .setFooter({ text: `Page 1/${total_pages}.` });
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
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.customId == 'left') page -= 1;
                    if (i.customId == 'right') page += 1;
                    replyMessage = "";
                    if (page < 0) page = total_pages - 1;
                    if (page >= total_pages) page = 0;
                    const start = PAGE_SIZE * page;
                    for (let idx = start; idx < start + PAGE_SIZE && idx < result.length; idx++) {
                        replyMessage += `#${idx + 1}. ${result[idx].name} - **${result[idx].totalLevel}** <:love:1352200821072199732>\n`;
                    }
                    leaderboard.setDescription(replyMessage);
                    leaderboard.setFooter({ text: `Page ${page + 1}/${total_pages}.` });
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });

                collector.on('end', async end => {
                    left.setDisabled(true);
                    right.setDisabled(true);
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });
            }
            // VALUE SUBCOMMAND
            else if (subCommand == "value") {
                const result = await charModel.aggregate([
                    { $sort: { numClaims: -1, name: 1 } }, // sort characters by numClaims in descending order, then sort alphabetically
                    { $project: { name: 1, numClaims: 1 } },    // return both name and numClaims
                ]);

                let replyMessage = "";
                for (let i = 0; i < PAGE_SIZE; i++) {
                    const points = await calculatePoints(result[i].numClaims, constants.RARITY_NUMS.COMMON);
                    replyMessage += `#${i + 1}. ${result[i].name} - **${points}** <:bells:1349182767958855853>\n`;
                }

                const total_pages = Math.ceil(constants.NUM_VILLAGERS / PAGE_SIZE);

                // make the message look nice
                const leaderboard = new EmbedBuilder()
                    .setTitle("Highest Value Cards")
                    .setDescription(replyMessage)
                    .setFooter({ text: `Page 1/${total_pages}.` });
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
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.customId == 'left') page -= 1;
                    if (i.customId == 'right') page += 1;
                    replyMessage = "";
                    if (page < 0) page = total_pages - 1;
                    if (page >= total_pages) page = 0;
                    const start = PAGE_SIZE * page;
                    for (let idx = start; idx < start + PAGE_SIZE && idx < constants.NUM_VILLAGERS; idx++) {
                        const points = await calculatePoints(result[idx].numClaims, constants.RARITY_NUMS.COMMON);
                        replyMessage += `#${idx + 1}. ${result[idx].name} - **${points}** <:bells:1349182767958855853>\n`;
                    }
                    leaderboard.setDescription(replyMessage);
                    leaderboard.setFooter({ text: `Page ${page + 1}/${total_pages}.` });
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });

                collector.on('end', async end => {
                    left.setDisabled(true);
                    right.setDisabled(true);
                    try {
                        await interaction.editReply({
                            embeds: [leaderboard],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });
            }
        } catch (err) {
            console.log(err);
            try {
                if (interaction.replied) await interaction.followUp(`There was an error displaying the leaderboard: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
                else await interaction.reply(`There was an error displaying the leaderboard: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};