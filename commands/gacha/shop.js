const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const villagers = require('../../villagerdata/data.json');
const charModel = require('../../models/charSchema');
const shopModel = require('../../models/shopSchema');
const constants = require('../../constants');
const { calculatePoints, escapeMarkdown, getOrCreateProfile, getOrCreateShop, getTimeString } = require('../../util');
const BASE_NUM_ITEMS = 4;
const BASE_PRICE_MULTIPLIER = 4;
const BASE_NUM_PRISMATICS = 1;
const REDD_QUOTES = ["Instead of tryin' to decide if it's real or not, it's more important to decide if ya really like it or not.",
    "Fool me once, shame on you. Fool me twice, stop foolin' me.",
    "I'll tell ya, today's items are as rare as they come! I'm almost green with envy that I can't buy 'em all!",
    "Won't find offers like these from any raccoon, that's for sure.",
    "We've got big discounts today! You won't wanna miss 'em!",
    "No refunds, no returns!",
    "My tent is your tent, cousin."];
const REDD_TITLES_PREFIX = ["HONORARY", "VAGUELY FAMILIAR", "CERTIFIED", "RELIABLE", "VALUED", "ESTEEMED", "BELOVED", "FAVORITE", "BEAUTIFUL", "PERFECT"];
const REDD_TITLES_SUFFIX = ["WINDOW SHOPPERS", "CUSTOMERS", "COUSINS", "VIPS", "SHAREHOLDERS"];

// REDD UPGRADE COST CONSTANTS
const BASE_TOTAL = 10_000;
const START_GROWTH = 2.04;
const GROWTH_DECAY_PER_TIER = 0.04;
const MIN_GROWTH = 1.3;

// UPGRADE INFO
const PRICE_TIERS = [
    { tier: 2, multiplier: 3.9 },
    { tier: 8, multiplier: 3.8 },
    { tier: 13, multiplier: 3.7 },
    { tier: 18, multiplier: 3.6 },
    { tier: 22, multiplier: 3.4 },
    { tier: 27, multiplier: 3.2 },
    { tier: 31, multiplier: 3.0 },
    { tier: 36, multiplier: 2.8 },
    { tier: 40, multiplier: 2.6 },
    { tier: 45, multiplier: 2.5 },
    { tier: 50, multiplier: 2.4 }
];
const ITEMS_TIERS = [
    { tier: 4, items: 5 },
    { tier: 10, items: 6 },
    { tier: 15, items: 7 },
    { tier: 19, items: 8 },
    { tier: 24, items: 9 },
    { tier: 28, items: 10 },
    { tier: 33, items: 11 },
    { tier: 37, items: 12 },
    { tier: 42, items: 13 },
    { tier: 46, items: 14 }
];
const PRISMATIC_TIERS = [
    { tier: 6, prismatics: 2 },
    { tier: 12, prismatics: 3 },
    { tier: 21, prismatics: 4 },
    { tier: 30, prismatics: 5 },
    { tier: 39, prismatics: 6 },
    { tier: 48, prismatics: 7 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription("Shop commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View what Redd has to offer.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy a card from Redd.')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('The number of the item you want to purchase.')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('donate')
                .setDescription(`Donate to Crazy Redd's.`)
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of Bells to donate.')
                        .setRequired(true)
                        .setMinValue(1)))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            // create or get shopData
            let shopData = await getOrCreateShop(interaction.guild.id);
            const numItems = getNumItems(shopData.reddTier);
            let actualNumItems = Math.min(numItems, shopData.merchandise.length); // use this to avoid indexing unrefreshed merchandise
            const numPrismatics = getNumPrismatics(shopData.reddTier);
            const priceMultiplier = getPriceMultiplier(shopData.reddTier);
            const subCommand = interaction.options.getSubcommand();
            // check if the merchandise should be updated
            const now = Date.now();
            if (now - shopData.lastRefreshed > constants.DAY) {
                // create the new shop
                const newMerchandise = [];
                // refresh the shop
                for (let i = 0; i < numItems; i++) {
                    const randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
                    const villager = villagers[randIdx];
                    newMerchandise.push({
                        id: crypto.randomUUID(),
                        name: villager.name,
                        rarity: constants.RARITY_NUMS.FOIL,
                        purchasedBy: null
                    });
                }
                // set prismatics
                const indices = Array.from({ length: numItems }, (_, i) => i);
                for (let i = 0; i < numPrismatics && indices.length > 0; i++) {
                    const randIdx = Math.floor(Math.random() * indices.length);
                    const chosen = indices.splice(randIdx, 1)[0]; // remove from array to prevent repeats
                    newMerchandise[chosen].rarity = constants.RARITY_NUMS.PRISMATIC;
                }
                // update lastRefreshed
                let newDate = new Date(now);
                newDate.setHours(0);
                newDate.setMinutes(0);
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                // avoid overwriting donations with atomic update
                await shopModel.updateOne(
                    { serverID: interaction.guild.id },
                    { $set: { merchandise: newMerchandise, lastRefreshed: newDate } }
                );
                // make sure the local data is also correct
                shopData.merchandise = newMerchandise;
                shopData.lastRefreshed = newDate;
                actualNumItems = numItems;
            }
            // VIEW SUBCOMMAND
            if (subCommand == 'view') {
                const shopEmbed = await getShopEmbed(shopData, now, actualNumItems, numItems, priceMultiplier, numPrismatics);
                await interaction.reply({
                    embeds: [shopEmbed]
                });
            }
            // BUY SUBCOMMAND
            else if (subCommand == 'buy') {
                const idx = interaction.options.getInteger('number') - 1;
                const item = shopData.merchandise[idx];
                // card already purchased
                if (item.purchasedBy != null) return await interaction.reply(`<:redd:1354073677318062153>: *"Sorry cousin, someone bought that already. You gotta be quick if you wanna take advantage of these deals!"*`);
                const charData = await charModel.findOne({ name: item.name });
                const points = await calculatePoints(charData.numClaims, item.rarity);
                const price = Math.ceil(points * priceMultiplier); // ceil because redd is a scam artist
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // not enough bells
                if (profileData.bells < price) return await interaction.reply(`<:redd:1354073677318062153>: *"Er... come back when you've got more Bells, cousin."* (Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${price}** <:bells:1349182767958855853>)`);
                // build reply
                const yes = new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success);
                const no = new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder()
                    .addComponents(yes, no);
                const messageContent = `<:redd:1354073677318062153>: *"Ahhh... you've got a discerning eye. That **${constants.RARITY_NAMES[item.rarity]} ${item.name}** is one-of-a-kind. Lucky for you, we're currently running a HUGE discount on it! For the meager price of **${price}** <:bells:1349182767958855853>, it can be yours! How about it?"*`;
                const reply = await interaction.reply({
                    content: messageContent,
                    components: [row],
                    withResponse: true,
                });
                // listen with a collector
                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                interaction.client.confirmationState[interaction.user.id] = true;

                collector.on('collect', async i => {
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.user.id != interaction.user.id) return;
                    if (i.customId == 'yes') {
                        const cardIdx = profileData.cards.findIndex(card => card.name === item.name);
                        const storageIdx = profileData.storage.findIndex(card => card.name === item.name)
                        // if user already has the card
                        if (cardIdx != -1) {
                            // if the rarity is lower or equal
                            if (item.rarity <= profileData.cards[cardIdx].rarity) {
                                profileData.cards[cardIdx].level += constants.RARITY_LVL[item.rarity];
                                profileData.bells -= price;
                                shopData.merchandise[idx].purchasedBy = interaction.user.displayName;
                                // upgrade the card if a level threshold was reached
                                if (profileData.cards[cardIdx].level >= constants.UPGRADE_THRESHOLDS[profileData.cards[cardIdx].rarity]) {
                                    profileData.cards[cardIdx].rarity += 1;
                                    try { await interaction.channel.send(`${interaction.user}, your **${card.name}** reached or passed level ${constants.UPGRADE_THRESHOLDS[profileData.cards[cardIdx].rarity - 1]} and was automatically upgraded to **${constants.RARITY_NAMES[profileData.cards[cardIdx].rarity]}**!`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                                }
                                try {
                                    // make the purchase
                                    const result = await shopModel.updateOne(
                                        { serverID: interaction.guild.id }, // match the server
                                        { $set: { "merchandise.$[elem].purchasedBy": interaction.user.displayName } },
                                        { arrayFilters: [{ "elem.id": item.id, "elem.purchasedBy": null }] }
                                    );
                                    if (result.matchedCount == 0) {
                                        await interaction.followUp("The item could not be purchased.");
                                    }
                                    else {
                                        try { await profileData.save(); } catch (err) { console.log(`There was an error updating the user profile in /shop: ${err}`); collector.stop(); return; }
                                    }
                                } catch (err) { console.log(`There was an error updating the shop profile in /shop: ${err}`); collector.stop(); return; }
                                collector.stop();
                                try { await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n**${escapeMarkdown(interaction.user.displayName)}** leveled up their **${item.name}**! (+**${constants.RARITY_LVL[item.rarity]}** <:love:1352200821072199732>)`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            }
                            // if the rarity is higher
                            else {
                                const oldRarity = profileData.cards[cardIdx].rarity;
                                profileData.cards[cardIdx].rarity = item.rarity;
                                profileData.cards[cardIdx].level += constants.RARITY_LVL[oldRarity];
                                const oldPoints = Math.floor(points / constants.RARITY_VALUE_MULTIPLIER[item.rarity]) * constants.RARITY_VALUE_MULTIPLIER[oldRarity]; // gets the base value, then finds the value of the card being sold, avoiding another call to calculatePoints()
                                profileData.bells += oldPoints;
                                profileData.bells -= price;
                                // wrap up
                                try {
                                    // make the purchase
                                    const result = await shopModel.updateOne(
                                        { serverID: interaction.guild.id }, // match the server
                                        { $set: { "merchandise.$[elem].purchasedBy": interaction.user.displayName } }, // set purchasedBy
                                        { arrayFilters: [{ "elem.id": item.id, "elem.purchasedBy": null }] } // target the exact element
                                    );
                                    if (result.matchedCount == 0) {
                                        await interaction.followUp("The item could not be purchased.");
                                    }
                                    else {
                                        try { await profileData.save(); } catch (err) { console.log(`There was an error updating the user profile in /shop: ${err}`); collector.stop(); return; }
                                    }
                                } catch (err) { console.log(`There was an error updating the shop profile in /shop: ${err}`); collector.stop(); return; }
                                collector.stop();
                                try { await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n**${escapeMarkdown(interaction.user.displayName)}** upgraded their **${item.name}** to **${constants.RARITY_NAMES[item.rarity]}**! (+**${oldPoints}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[oldRarity]}** <:love:1352200821072199732>)`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            }
                        }
                        // the user has the card in storage
                        else if (storageIdx != -1) {
                            try { await interaction.channel.send(`${interaction.user}, you cannot buy cards you already have in storage. You must first sell the card with **/sell** or move it to your deck with **/storage move**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        }
                        // if the user has less cards than their max deck size
                        else if (profileData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                            profileData.cards.push({ name: item.name, rarity: item.rarity });
                            profileData.bells -= price;
                            // wrap up
                            try {
                                // make the purchase
                                const result = await shopModel.updateOne(
                                    { serverID: interaction.guild.id }, // match the server
                                    { $set: { "merchandise.$[elem].purchasedBy": interaction.user.displayName } }, // set purchasedBy
                                    { arrayFilters: [{ "elem.id": item.id, "elem.purchasedBy": null }] } // target the exact element
                                );
                                if (result.matchedCount == 0) {
                                    await interaction.followUp("The item could not be purchased.");
                                }
                                else {
                                    try { await profileData.save(); } catch (err) { console.log(`There was an error updating the user profile in /shop: ${err}`); collector.stop(); return; }
                                }
                            } catch (err) { console.log(`There was an error updating the shop profile in /shop: ${err}`); collector.stop(); return; }
                            collector.stop();
                            try { await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*  (**${item.name}** was added to your deck!)`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            // track the claim in the db
                            charData.numClaims += 1;
                            try { await charData.save(); } catch (err) { console.log(`There was an error updating numClaims: ${err}`); }
                        }
                        // if user has room in storage
                        else if (profileData.storage.length < constants.BLATIER_TO_STORAGE_LIMIT[profileData.blaTier]) {
                            let rarityUpgradeMsg = null;
                            // BLATHERS V BONUS
                            if (profileData.blaTier == constants.UPGRADE_COSTS.length) {
                                let randIdx = Math.floor(Math.random() * 101);
                                if (randIdx < constants.BLATHERS_BONUS_CHANCE && item.rarity < constants.RARITY_NAMES.length - 1) { // if the odds hit and the card isn't max rarity
                                    shopData.merchandise[idx].rarity += 1;
                                    rarityUpgradeMsg = ` (Upgraded to **${constants.RARITY_NAMES[rarity]}** by <:blathers:1349263646206857236> **Blathers V**)`;
                                }
                            }
                            // BLATHERS III BONUS
                            if (profileData.blaTier < 3) profileData.storage.push({ name: item.name, rarity: shopData.merchandise[idx].rarity });
                            else {
                                profileData.storage.push({ name: item.name, rarity: shopData.merchandise[idx].rarity, level: 1 + constants.BLATHERS_BONUS_LVLS });
                            }
                            let followUpMsg = `<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*  (**${item.name}** was sent to your storage!)`;
                            // BLATHERS III BONUS
                            if (profileData.blaTier >= 3) {
                                followUpMsg += ` (+**${constants.BLATHERS_BONUS_LVLS}** <:love:1352200821072199732> from <:blathers:1349263646206857236> **Blathers III**)`
                            }
                            profileData.bells -= price;
                            // BLATHERS V MESSAGE
                            if (rarityUpgradeMsg) followUpMsg += rarityUpgradeMsg;
                            // wrap up
                            try {
                                // make the purchase
                                const result = await shopModel.updateOne(
                                    { serverID: interaction.guild.id }, // match the server
                                    { $set: { "merchandise.$[elem].purchasedBy": interaction.user.displayName } }, // set purchasedBy
                                    { arrayFilters: [{ "elem.id": item.id, "elem.purchasedBy": null }] } // target the exact element
                                );
                                if (result.matchedCount == 0) {
                                    await interaction.followUp("The item could not be purchased.");
                                }
                                else {
                                    try { await profileData.save(); } catch (err) { console.log(`There was an error updating the user profile in /shop: ${err}`); collector.stop(); return; }
                                }
                            } catch (err) { console.log(`There was an error updating the shop profile in /shop: ${err}`); collector.stop(); return; }
                            collector.stop();
                            try { await interaction.followUp(followUpMsg); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            // track the claim in the db
                            charData.numClaims += 1;
                            try { await charData.save(); } catch (err) { console.log(`There was an error updating numClaims: ${err}`); }
                        }
                        else {
                            await interaction.channel.send(`${interaction.user}, your deck is full, so you cannot purchase **${item.name}**. Try selling a card for Bells using **/sell**, or getting more deck slots with **/upgrade**.`);
                        }
                        collector.stop();
                    }
                    else {
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."*`);
                        collector.stop();
                    }
                });

                collector.on('end', async (collected, reason) => {
                    yes.setDisabled(true);
                    no.setDisabled(true);
                    try {
                        await interaction.editReply({
                            content: messageContent,
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                    interaction.client.confirmationState[interaction.user.id] = false;
                    if (reason === 'time') {
                        try { await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                });

            }
            // DONATE SUBCOMMAND
            else {
                const amount = interaction.options.getInteger('amount');
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                if (profileData.bells < amount) return await interaction.reply(`<:redd:1354073677318062153>: *"I appreciate the gesture, cousin, but ya don't have enough Bells for it!"*`);
                // build reply
                const yes = new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success);
                const no = new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder()
                    .addComponents(yes, no);
                const messageContent = `${interaction.user}, are you sure you want to donate **${amount}** <:bells:1349182767958855853>?`;
                const reply = await interaction.reply({
                    content: messageContent,
                    components: [row],
                    withResponse: true,
                });
                // listen with a collector
                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                interaction.client.confirmationState[interaction.user.id] = true;
                collector.on('collect', async i => {
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.user.id != interaction.user.id) return;
                    if (i.customId === 'yes') {
                        profileData.bells -= amount;
                        await profileData.save();
                        // if the user has donated before
                        const updateResult = await shopModel.updateOne(
                            { serverID: interaction.guild.id, "donors.userID": interaction.user.id },
                            {
                                $inc: { "donors.$.amount": amount, totalDonations: amount }
                            }
                        );
                        // it's the user's first donation
                        if (updateResult.matchedCount == 0) {
                            await shopModel.updateOne(
                                { serverID: interaction.guild.id },
                                {
                                    $push: { donors: { userID: interaction.user.id, amount } },
                                    $inc: { totalDonations: amount }
                                }
                            );
                        }
                        const newShopData = await shopModel.findOne(
                            { serverID: interaction.guild.id },
                            { totalDonations: 1, reddTier: 1 }
                        );
                        const oldTier = newShopData.reddTier;
                        const oldNumItems = numItems;
                        const oldNumPrismatics = numPrismatics;
                        const oldMultiplier = priceMultiplier;
                        let newTier = oldTier;
                        // check for tier increase
                        while (newTier < 50 && newShopData.totalDonations >= totalForTier(newTier + 1)) {
                            newTier++;
                        }
                        if (newTier > oldTier) {
                            await shopModel.updateOne(
                                { serverID: interaction.guild.id },
                                { $set: { reddTier: newTier } }
                            );
                            const newNumItems = getNumItems(newTier);
                            const newNumPrismatics = getNumPrismatics(newTier);
                            const newMultiplier = getPriceMultiplier(newTier);
                            try {
                                const benefitTokens = [];
                                benefitTokens.push(`**+${newTier - oldTier}** <:redd:1354073677318062153>`);

                                // Discount
                                const oldDiscountPercent = Math.round(
                                    (1 - oldMultiplier / BASE_PRICE_MULTIPLIER) * 100
                                );
                                const newDiscountPercent = Math.round(
                                    (1 - newMultiplier / BASE_PRICE_MULTIPLIER) * 100
                                );

                                if (newDiscountPercent > oldDiscountPercent) {
                                    benefitTokens.push(`**+${newDiscountPercent - oldDiscountPercent}%** :label:`);
                                }

                                // Merchandise
                                if (newNumItems > oldNumItems) {
                                    benefitTokens.push(`**+${newNumItems - oldNumItems}** :shopping_cart:`);
                                }

                                // Prismatics
                                if (newNumPrismatics > oldNumPrismatics) {
                                    benefitTokens.push(
                                        `**+${newNumPrismatics - oldNumPrismatics}** <:prismatic:1359641457702604800>`
                                    );
                                }
                                let msg = `<:redd:1354073677318062153>: *"Thanks for the donation, cousin! Your server's **Membership Level** has increased!"*`;
                                msg += `  (${benefitTokens.join(', ')})`;
                                await interaction.followUp(msg);
                            } catch (err) { console.log(`There was an error following up in /donate: ${err}`) }
                        } else {
                            try {
                                await interaction.followUp(
                                    `<:redd:1354073677318062153>: *"Thanks for the donation, cousin!"*`
                                );
                            } catch (err) { console.log(`There was an error following up in /donate: ${err}`) }
                        }
                    } else {
                        try { await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."* (The donation was cancelled.)`); } catch (err) { console.log(`There was an error following up in /donate: ${err}`); }
                    }
                    collector.stop();
                });

                collector.on('end', async (collected, reason) => {
                    yes.setDisabled(true);
                    no.setDisabled(true);
                    try {
                        await interaction.editReply({
                            content: messageContent,
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                    interaction.client.confirmationState[interaction.user.id] = false;
                    if (reason === 'time') {
                        try { await interaction.followUp(`${interaction.user}, you didn't confirm the donation in time. The donation was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                });
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error visiting Redd's shop: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};

async function getShopEmbed(shopData, now, actualNumItems, numItems, priceMultiplier, numPrismatics) {
    const timeSinceReset = now - shopData.lastRefreshed;
    const timeRemaining = constants.DAY - timeSinceReset;
    let shopMsg = `Welcome to <:redd:1354073677318062153> **Crazy Redd's**. Merchandise will refresh in ${getTimeString(timeRemaining)}. Use **/shop buy [number]** to buy something.\n\n`;
    for (let i = 0; i < actualNumItems; i++) {
        const item = shopData.merchandise[i];
        shopMsg += `**${i + 1}**: **${item.name}** `;
        if (item.rarity == constants.RARITY_NUMS.FOIL) shopMsg += "<:foil:1414625123536732240> ";
        else if (item.rarity == constants.RARITY_NUMS.PRISMATIC) shopMsg += `<:prismatic:1359641457702604800> `;
        if (item.purchasedBy != null) {
            shopMsg += `- *Purchased by ${item.purchasedBy}*\n`
        }
        else {
            // get the points
            const charData = await charModel.findOne({ name: item.name });
            const points = await calculatePoints(charData.numClaims, shopData.merchandise[i].rarity);
            shopMsg += `- **${Math.ceil(points * priceMultiplier)}** <:bells:1349182767958855853>\n`;
        }
    }
    const randIdx = Math.floor(Math.random() * REDD_QUOTES.length)
    shopMsg += `\n<:redd:1354073677318062153>: *"${REDD_QUOTES[randIdx]}"*`;
    // donation info
    if (shopData.reddTier == 50) {
        shopMsg += `\n\nYour server has achieved <:redd:1354073677318062153> **Tier ${constants.REDD_NUMERALS[shopData.reddTier - 1]}**, making you **${getReddTitle(shopData.reddTier)}**. There are no more tiers, but you can continue donating to move your server up the leaderboards."`;
    }
    else if (shopData.reddTier > 0) {
        shopMsg += `\n\nYour server has achieved <:redd:1354073677318062153> **Tier ${constants.REDD_NUMERALS[shopData.reddTier - 1]}**, making you **${getReddTitle(shopData.reddTier)}**. Use **/shop donate [amount]** to increase your <:redd:1354073677318062153> **Membership Level**.`;
    }
    else {
        shopMsg += `\n\nYour server has not donated enough Bells to increase its <:redd:1354073677318062153> **Membership Level**. Use **/shop donate [amount]** to get started.`;
    }
    const discountPercent = Math.round((1 - priceMultiplier / BASE_PRICE_MULTIPLIER) * 100);
    shopMsg += `\n\n:label: **${discountPercent}% off**, :shopping_cart: ${numItems} **(+${numItems - BASE_NUM_ITEMS})**, <:prismatic:1359641457702604800> ${numPrismatics} **(+${numPrismatics - BASE_NUM_PRISMATICS})**`;
    const shopEmbed = new EmbedBuilder()
        .setDescription(shopMsg);
    return shopEmbed;
}

function getNumItems(tier) {
    let items = BASE_NUM_ITEMS;
    for (const step of ITEMS_TIERS) {
        if (tier >= step.tier) items = step.items;
        else break;
    }
    return items;
}

function getNumPrismatics(tier) {
    let prismatics = BASE_NUM_PRISMATICS;
    for (const step of PRISMATIC_TIERS) {
        if (tier >= step.tier) prismatics = step.prismatics;
        else break;
    }
    return prismatics;
}

function getPriceMultiplier(tier) {
    let multiplier = BASE_PRICE_MULTIPLIER;
    for (const step of PRICE_TIERS) {
        if (tier >= step.tier) multiplier = step.multiplier;
        else break;
    }
    return multiplier;
}

function getReddTitle(tier) {
    const prefix = REDD_TITLES_PREFIX[(tier - 1) % REDD_TITLES_PREFIX.length];
    const suffix = REDD_TITLES_SUFFIX[Math.floor((tier - 1) / REDD_TITLES_PREFIX.length) % REDD_TITLES_SUFFIX.length];
    return `${prefix} ${suffix}`;
}

function growthForTier(tier) {
    return Math.max(
        MIN_GROWTH,
        START_GROWTH - tier * GROWTH_DECAY_PER_TIER
    );
}

// returns the total donations required for a tier
function totalForTier(tier) {
    let total = BASE_TOTAL;
    for (let i = 1; i < tier; i++) {
        total = Math.floor(total * growthForTier(i));
    }
    return total;
}