const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const villagers = require('../../villagerdata/data.json');
const shopModel = require('../../models/shopSchema');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getTimeString } = require('../../util');
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
                    option.setName('item #')
                        .setDescription('The number of the item you want to purchase.')
                        .setRequired(true))
                .setMinValue(1)
                .setMaxValue(NUM_ITEMS))
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
                // refresh the shop
                shopData.merchandise.length = 0;
                for (let i = 0; i < NUM_ITEMS; i++) {
                    // pick a random character
                    let randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
                    const villager = villagers[randIdx];
                    // for now, all cards will simply be foil
                    shopData.merchandise.push({ name: villager.name, rarity: constants.RARITY_NUMS.FOIL, isPurchased: false });
                }
                let newDate = new Date(now);
                newDate.setHours(0);
                newDate.setMinutes(0);
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                shopData.lastRefreshed = newDate;
                await shopData.save();
            }
            // VIEW SUBCOMMAND
            if (subCommand == view) {
                const timeRemaining = shopData.lastRefreshed + constants.DAY - now;
                const timeString = getTimeString(timeRemaining);
                let shopMsg = `Welcome to **Crazy Redd's shop**. Available merchandise will refresh in **${timeString}**. Use **/shop buy [number]** to buy something.\n\n`;
                for (let i = 0; i < NUM_ITEMS; i++) {
                    const item = shopData.merchandise[i];
                    shopMsg += `**${i + 1}**: `;
                    if (item.isPurchased) {
                        shopMsg += `*Purchased*\n`
                    }
                    else {
                        shopMsg += `**${item.name}** `;
                        if (item.rarity == constants.RARITY_NUMS.FOIL) shopMsg += ":sparkles: ";
                        // get the points
                        const charData = await charModel.findOne({ name: item.name });
                        const points = await calculatePoints(charData.numClaims, rarity);
                        shopMsg += `- **${points * REDD_PRICE_MULTIPLIER}** <:bells:1349182767958855853>\n`;
                    }
                }
                const randIdx = Math.floor(Math.random(REDD_QUOTES.length))
                shopMsg += `\n<:redd:1354073677318062153>: *"${REDD_QUOTES[randIdx]}"*`;
                // make the message look nice
                const deckEmbed = new EmbedBuilder()
                    .setDescription(shopMsg);
                await interaction.reply({
                    embeds: [deckEmbed]
                });
            }
            // BUY SUBCOMMAND
            else {
                const idx = interaction.options.getInteger('item #');
                const item = shopData.merchandise[idx];
                // card already purchased
                if (item.isPurchased) return await interaction.reply(`<:redd:1354073677318062153>: *"Sorry cousin, someone bought that already. You gotta be quick if you wanna take advantage of these deals!"*`);
                const charData = await charModel.findOne({ name: item.name });
                const points = await calculatePoints(charData.numClaims, rarity);
                const price = points * REDD_PRICE_MULTIPLIER;
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // not enough bells
                if (profileData.bells < price) return await interaction.reply(`<:redd:1354073677318062153>: *"Er... come back when you've got more Bells, cousin."* (Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${price}** <:bells:1349182767958855853>)`);
                // send confirmation msg
                await interaction.reply(`<:redd:1354073677318062153>: "Ahhh... you've got a discerning eye. That **${constants.RARITY_NAMES[item.rarity]} ${item.name}** is one-of-a-kind. Lucky for you, we're running a huge discount on it today. For the meager price of **${price}** <:bells:1349182767958855853>, it can be yours. Will you buy it? (y/n)`);
                const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                interaction.client.confirmationState[interaction.user.id] = true;
                setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                collector.on('collect', async (m) => {
                    if (m.content == 'y') {
                        // TODO: use same logic as claiming
                        profileData.bells -= price;
                        shopData[idx].isPurchased = true;
                        await profileData.save();
                        await shopData.save();
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Feh heh heh... thank you kindly!"*`);
                    }
                    else {
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."* (The purchase was cancelled.)`);
                    }
                    collector.stop();
                });

                collector.on('end', async (collected, reason) => {
                    interaction.client.confirmationState[interaction.user.id] = false;
                    if (reason === 'time') {
                        await interaction.followUp(`<:redd:1354073677318062153>: *"Thanks a lot..."* (You didn't type 'y' or 'n' in time. The purchase was cancelled.)`);
                    }
                });

            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error visiting Redd's shop.`);
        }
    },
};