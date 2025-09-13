const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getOwnershipFooter, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription("View a card.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The name of the card to be viewed.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('rarity')
                .setDescription('The rarity of the card to be viewed (default is Common).')
                .addChoices(
                    { name: "Common", value: 0 },
                    { name: "Foil", value: 1 },
                    { name: "Prismatic", value: 2 }
                )
        )
        .addUserOption(option =>
            option.setName('owner')
                .setDescription('The owner of the card to be viewed (optional).'))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "");
            const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName);

            if (villager) {
                // get rarity data
                let rarity = interaction.options.getNumber('rarity') ?? constants.RARITY_NUMS.COMMON;
                // get villager data
                let charData = await charModel.findOne({ name: villager.name });
                const points = await calculatePoints(charData.numClaims, rarity);
                const rank = await getRank(villager.name);
                let personality = villager.personality;
                if (!personality) personality = "Special";
                let gender = villager.gender;
                if (!gender) gender = `:transgender_symbol:`; // edge case for Somebody
                else gender = `:${gender.toLowerCase()}_sign:`;
                // make the message look nice
                const viewEmbed = new EmbedBuilder()
                    .setTitle(villager.name)
                    .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[rarity]}***\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
                    .setImage(villager.image_url);
                try { viewEmbed.setColor(villager.title_color); } catch (err) { viewEmbed.setColor("White"); } // set color
                const owner = interaction.options.getUser('owner');
                if (owner) {
                    if (owner.bot) return await interaction.reply({ content: "You supplied a bot for the owner argument. Please specify a real user or leave the field blank.", flags: MessageFlags.Ephemeral });
                    const ownerData = await getOrCreateProfile(owner.id, interaction.guild.id);
                    const cardIdx = ownerData.cards.findIndex(card => card.name == villager.name);
                    // the owner does not have the card in their deck
                    if (cardIdx == -1) {
                        const storageIdx = ownerData.storage.findIndex(card => card.name == villager.name);
                        // the owner has the card in storage
                        if (storageIdx != -1) {
                            const card = ownerData.storage[storageIdx];
                            // the rarity was specified, and the owner has a different rarity
                            if (interaction.options.getNumber('rarity') && card.rarity != rarity) { return await interaction.reply(`The specified rarity was not found, but the card itself was. Try using the same command, but without rarity.`); }
                            const realPoints = await calculatePoints(charData.numClaims, card.rarity); // get the points based on the rarity of the card in the owner's deck
                            viewEmbed.setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[card.rarity]}***\n**${realPoints}**  <:bells:1349182767958855853>  |  **${card.level}** <:love:1352200821072199732>\nRanking: #${rank}`);
                            if (card.rarity == constants.RARITY_NUMS.FOIL) viewEmbed.setTitle(`<:foil:1414625123536732240> ${villager.name} <:foil:1414625123536732240>`);
                            else if (card.rarity == constants.RARITY_NUMS.PRISMATIC) viewEmbed.setTitle(`<:prismatic:1359641457702604800> ${villager.name} <:prismatic:1359641457702604800>`);
                            viewEmbed.setFooter({ text: `Stored by ${owner.displayName}`, iconURL: owner.displayAvatarURL() });
                        }
                        else return await interaction.reply(`No card named **${cardName}** found in the specified deck.`);
                    }
                    // the owner has the card in their deck
                    else {
                        const card = ownerData.cards[cardIdx];
                        // the rarity was specified, and the owner has a different rarity
                        if (interaction.options.getNumber('rarity') && card.rarity != rarity) { return await interaction.reply(`The specified rarity was not found, but the card itself was. Try using the same command, but without rarity.`); }
                        const realPoints = await calculatePoints(charData.numClaims, card.rarity); // get the points based on the rarity of the card in the owner's deck
                        viewEmbed.setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[card.rarity]}***\n**${realPoints}**  <:bells:1349182767958855853>  |  **${card.level}** <:love:1352200821072199732>\nRanking: #${rank}`);
                        if (card.rarity == constants.RARITY_NUMS.FOIL) viewEmbed.setTitle(`<:foil:1414625123536732240> ${villager.name} <:foil:1414625123536732240>`);
                        else if (card.rarity == constants.RARITY_NUMS.PRISMATIC) viewEmbed.setTitle(`<:prismatic:1359641457702604800> ${villager.name} <:prismatic:1359641457702604800>`);
                        viewEmbed.setFooter({ text: `Belongs to ${owner.displayName}`, iconURL: owner.displayAvatarURL() });
                        if (ownerData.deckColor) viewEmbed.setColor(ownerData.deckColor);
                    }
                }
                else {
                    if (rarity == constants.RARITY_NUMS.FOIL) viewEmbed.setTitle(`<:foil:1414625123536732240> ${villager.name} <:foil:1414625123536732240>`);
                    else if (rarity == constants.RARITY_NUMS.PRISMATIC) viewEmbed.setTitle(`<:prismatic:1359641457702604800> ${villager.name} <:prismatic:1359641457702604800>`);
                    // get card owners and wishers
                    let cardOwners = [];
                    const guildProfiles = await profileModel.find({ serverID: interaction.guild.id });
                    for (const profile of guildProfiles) {
                        for (const card of profile.cards) {
                            if (card.name == villager.name && card.rarity == rarity) { // >= rarity?
                                try {
                                    const user = await interaction.client.users.fetch(profile.userID);
                                    if (profile.userID == interaction.user.id) cardOwners.unshift({ name: user.displayName, level: card.level });
                                    else insertSorted(cardOwners, { name: user.displayName, level: card.level });
                                }
                                catch (err) {
                                    console.log(`Card owner not found: `, err)
                                }
                            }
                        }
                    }
                    // remove the level field so cardOwners only tracks names
                    for (let i = 0; i < cardOwners.length; i++) {
                        cardOwners[i] = cardOwners[i].name;
                    }
                    // add the ownership footer
                    const ownershipFooter = getOwnershipFooter(cardOwners);
                    if (ownershipFooter != "") {
                        viewEmbed.setFooter({
                            text: ownershipFooter,
                        })
                    }
                }
                await interaction.reply({ embeds: [viewEmbed] });
            }
            else {
                await interaction.reply(`No card named **${cardName}** found. Check your spelling.`);
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error trying to view the card: ${err.name}.  Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};

function insertSorted(arr, item) {
    let low = 0, high = arr.length;
    while (low < high) {
        let mid = Math.floor((low + high) / 2);
        if (arr[mid].level > item.level) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    arr.splice(low, 0, item);
}