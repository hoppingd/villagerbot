const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const villagers = require('../../villagerdata/data.json');
const shopModel = require('../../models/shopSchema');
const charModel = require('../../models/charSchema');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getTimeString, isYesOrNo } = require('../../util');
const NUM_ITEMS = 4;
const REDD_PRICE_MULTIPLIER = 4;
const REDD_QUOTES = ["Instead of tryin' to decide if it's real or not, it's more important to decide if ya really like it or not.",
    "Fool me once, shame on you. Fool me twice, stop foolin' me.",
    "I'll tell ya, today's items are as rare as they come! I'm almost green with envy that I can't buy 'em all!",
    "Won't find offers like these from any raccoon, that's for sure.",
    "We've got big discounts today! You won't wanna miss 'em!",
    "No refunds, no returns!",
    "My tent is your tent, cousin."];

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
                        .setMinValue(1)
                        .setMaxValue(NUM_ITEMS)))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            // create or get shopData
            let shopData = await shopModel.findOne({ serverID: interaction.guild.id });
            if (!shopData) {
                shopData = await shopModel.create({
                    serverID: interaction.guild.id
                });
                await shopData.save();
            }
            // check if the merchandise should be updated
            const now = Date.now();
            if (now - shopData.lastRefreshed > constants.DAY) {
                // empty the shop
                while (shopData.merchandise.length) shopData.merchandise.pop();
                // refresh the shop
                for (let i = 0; i < NUM_ITEMS; i++) {
                    // pick a random character
                    let randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
                    const villager = villagers[randIdx];
                    // set all cards to foil
                    shopData.merchandise.push({ name: villager.name, rarity: constants.RARITY_NUMS.FOIL, purchasedBy: null });
                }
                // set one card randomly to prismatic
                const prismaticIdx = Math.floor(Math.random() * NUM_ITEMS);
                shopData.merchandise[prismaticIdx].rarity = constants.RARITY_NUMS.PRISMATIC;
                // update lastRefreshed
                let newDate = new Date(now);
                newDate.setHours(0);
                newDate.setMinutes(0);
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                shopData.lastRefreshed = newDate;
                await shopData.save();
            }
            // VIEW SUBCOMMAND
            if (subCommand == 'view') {
                const shopEmbed = await getShopEmbed(shopData, now);
                await interaction.reply({
                    embeds: [shopEmbed]
                });
            }
            // BUY SUBCOMMAND
            else {
                const idx = interaction.options.getInteger('number') - 1;
                const item = shopData.merchandise[idx];
                // card already purchased
                if (item.purchasedBy != null) return await interaction.reply(`<:redd:1354073677318062153>: *"Sorry cousin, someone bought that already. You gotta be quick if you wanna take advantage of these deals!"*`);
                const charData = await charModel.findOne({ name: item.name });
                const points = await calculatePoints(charData.numClaims, item.rarity);
                const price = points * REDD_PRICE_MULTIPLIER;
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // not enough bells
                if (profileData.bells < price) return await interaction.reply(`<:redd:1354073677318062153>: *"Er... come back when you've got more Bells, cousin."* (Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${price}** <:bells:1349182767958855853>)`);
                // set the shop to active and check if it is already active
                if (interaction.client.activeShops[interaction.guild.id]) return await interaction.reply(`Someone else is currently using the shop. Please try again later.`);
                else {
                    interaction.client.activeShops[interaction.guild.id] = true;
                }
                // send confirmation msg
                await interaction.reply(`<:redd:1354073677318062153>: *"Ahhh... you've got a discerning eye. That **${constants.RARITY_NAMES[item.rarity]} ${item.name}** is one-of-a-kind. Lucky for you, we're currently running a HUGE discount on it! For the meager price of **${price}** <:bells:1349182767958855853>, it can be yours! How about it?"* (y/n)`);
                const collectorFilter = m => (m.author.id == interaction.user.id && isYesOrNo(m.content));
                const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: constants.CONFIRM_TIME_LIMIT });
                interaction.client.confirmationState[interaction.user.id] = true;

                collector.on('collect', async (m) => {
                    if (m.content.toLowerCase() == 'y') {
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
                                    await interaction.channel.send(`${reactor}, your **${card.name}** reached or passed level ${constants.UPGRADE_THRESHOLDS[profileData.cards[cardIdx].rarity - 1]} and was automatically upgraded to ${constants.RARITY_NAMES[profileData.cards[reactorCardIdx].rarity]}!`);
                                }
                                await profileData.save();
                                await shopData.save();
                                collector.stop();
                                await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n**${interaction.user.displayName}** leveled up their **${item.name}**! (+**${constants.RARITY_LVL[item.rarity]}** <:love:1352200821072199732>)`);
                            }
                            // if the rarity is higher
                            else {
                                const oldRarity = profileData.cards[cardIdx].rarity;
                                profileData.cards[cardIdx].rarity = item.rarity;
                                profileData.cards[cardIdx].level += constants.RARITY_LVL[oldRarity];
                                const oldPoints = Math.floor(points / constants.RARITY_VALUE_MULTIPLIER[item.rarity]) * constants.RARITY_VALUE_MULTIPLIER[oldRarity]; // gets the base value, then finds the value of the card being sold, avoiding another call to calculatePoints()
                                profileData.bells += oldPoints;
                                profileData.bells -= price;
                                shopData.merchandise[idx].purchasedBy = interaction.user.displayName;
                                // wrap up
                                await profileData.save();
                                await shopData.save();
                                collector.stop();
                                await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n**${interaction.user.displayName}** upgraded their **${item.name}** to **${constants.RARITY_NAMES[item.rarity]}**! (+**${oldPoints}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[oldRarity]}** <:love:1352200821072199732>)`);
                            }
                        }
                        // the user has the card in storage
                        else if (storageIdx != -1) {
                            await interaction.channel.send(`${interaction.user}, you cannot buy cards you already have in storage. You must first sell the card with **/sell** or move it to your deck with **/storage move**.`);
                        }
                        // if the user has less cards than their max deck size
                        else if (profileData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                            profileData.cards.push({ name: item.name, rarity: item.rarity });
                            profileData.bells -= price;
                            shopData.merchandise[idx].purchasedBy = interaction.user.displayName;
                            // wrap up
                            await profileData.save();
                            await shopData.save();
                            collector.stop();
                            await interaction.followUp(`<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n ${interaction.user.displayName} claimed **${item.name}**!`);
                            // track the claim in the db
                            charData.numClaims += 1;
                            charData.save();
                        }
                        // if user has room in storage
                        else if (profileData.storage.length < constants.BLATIER_TO_STORAGE_LIMIT[profileData.blaTier]) {
                            // BLATHERS V BONUS
                            if (profileData.blaTier == constants.UPGRADE_COSTS.length) {
                                let randIdx = Math.floor(Math.random() * 101);
                                if (randIdx < constants.BLATHERS_BONUS_CHANCE && item.rarity < constants.RARITY_NAMES.length - 1) { // if the odds hit and the card isn't max rarity
                                    shopData.merchandise[idx].rarity += 1;
                                    interaction.channel.send(`${item.name} rarity upgraded to ${constants.RARITY_NAMES[shopData.merchandise[idx].rarity]} by <:blathers:1349263646206857236> **Blathers V**.`);
                                }
                            }
                            // BLATHERS III BONUS
                            if (profileData.blaTier < 3) profileData.storage.push({ name: item.name, rarity: shopData.merchandise[idx].rarity });
                            else {
                                profileData.storage.push({ name: item.name, rarity: shopData.merchandise[idx].rarity, level: 1 + constants.BLATHERS_BONUS_LVLS });
                            }
                            let followUpMsg = `<:redd:1354073677318062153>: *"Pleasure doin' business with ya, ${interaction.user}!"*\n${interaction.user.displayName} claimed **${item.name}**! The card was sent to their storage.`;
                            // BLATHERS III BONUS
                            if (profileData.blaTier >= 3) {
                                followUpMsg += ` (+**${constants.BLATHERS_BONUS_LVLS}** <:love:1352200821072199732> from <:blathers:1349263646206857236> **Blathers III**)`
                            }
                            profileData.bells -= price;
                            shopData.merchandise[idx].purchasedBy = interaction.user.displayName;
                            // wrap up
                            await profileData.save();
                            await shopData.save();
                            collector.stop();
                            await interaction.followUp(followUpMsg);
                            // track the claim in the db
                            charData.numClaims += 1;
                            charData.save();
                        }
                        else {
                            await interaction.channel.send(`${reactor}, your deck is full, so you cannot purchase **${item.name}**. Try selling a card for Bells using **/sell**, or getting more deck slots with **/upgrade**.`);
                        }
                        collector.stop();
                    }
                    else {
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."*`);
                        collector.stop();
                    }
                });

                collector.on('end', async (collected, reason) => {
                    interaction.client.confirmationState[interaction.user.id] = false;
                    interaction.client.activeShops[interaction.guild.id] = false;
                    if (reason === 'time') {
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."*`);
                    }
                });

            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error visiting Redd's shop: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server.") }
        }
    },
};

async function getShopEmbed(shopData, now) {
    const timeSinceReset = now - shopData.lastRefreshed;
    const timeRemaining = constants.DAY - timeSinceReset;
    let shopMsg = `Welcome to **Crazy Redd's**. Merchandise will refresh in ${getTimeString(timeRemaining)}. Use **/shop buy [number]** to buy something.\n\n`;
    for (let i = 0; i < NUM_ITEMS; i++) {
        const item = shopData.merchandise[i];
        shopMsg += `**${i + 1}**: **${item.name}** `;
        if (item.rarity == constants.RARITY_NUMS.FOIL) shopMsg += ":sparkles: ";
        else if (item.rarity == constants.RARITY_NUMS.PRISMATIC) shopMsg += `<:prismatic:1359641457702604800> `;
        if (item.purchasedBy != null) {
            shopMsg += `- *Purchased by ${item.purchasedBy}*\n`
        }
        else {
            // get the points
            const charData = await charModel.findOne({ name: item.name });
            const points = await calculatePoints(charData.numClaims, shopData.merchandise[i].rarity);
            shopMsg += `- **${points * REDD_PRICE_MULTIPLIER}** <:bells:1349182767958855853>\n`;
        }
    }
    const randIdx = Math.floor(Math.random() * REDD_QUOTES.length)
    shopMsg += `\n<:redd:1354073677318062153>: *"${REDD_QUOTES[randIdx]}"*`;
    // make the message look nice
    const shopEmbed = new EmbedBuilder()
        .setDescription(shopMsg);
    return shopEmbed;
}