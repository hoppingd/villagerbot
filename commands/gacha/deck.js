const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, SlashCommandBuilder, MessageFlags } = require('discord.js');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');
const charModel = require('../../models/charSchema');
const { calculatePoints, getOrCreateProfile, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription("Shows a user's deck in carousel format.")
        .addUserOption(option =>
            option.setName('owner')
                .setDescription("The deck's owner (if no owner is specified, your deck will be shown).")
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const target = interaction.options.getUser('owner') ?? interaction.user;
            if (target.bot) return await interaction.reply({ content: "You supplied a bot for the owner argument. Please specify a real user or leave the field blank.", flags: MessageFlags.Ephemeral });
            const profileData = await getOrCreateProfile(target.id, interaction.guild.id);
            if (profileData.cards.length == 0) {
                if (target.id == interaction.user.id) await interaction.reply(`You have no cards in your deck. Type **/roll** and react to claim some cards!`);
                else await interaction.reply(`There are no cards in the specified deck.`);
            }
            else {
                let page = 0;
                // get preliminary info
                let deckName = profileData.deckName;
                if (deckName == null) deckName = `${target.displayName}'s Deck`;
                let deckColor = profileData.deckColor;
                let deck = profileData.cards;
                // form the header embed
                const deckEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `${deckName} (${page + 1}/${deck.length})`,
                        iconURL: target.displayAvatarURL(),
                    });
                if (deckColor) deckEmbed.setColor(deckColor);
                // get the card embed
                let cardEmbed = await getCardEmbed(deck[page], target, profileData.deckColor);
                // add pagination
                const left = new ButtonBuilder()
                    .setCustomId('left')
                    .setLabel('Previous Card')
                    .setStyle(ButtonStyle.Primary);
                const right = new ButtonBuilder()
                    .setCustomId('right')
                    .setLabel('Next Card')
                    .setStyle(ButtonStyle.Primary);
                const row = new ActionRowBuilder()
                    .addComponents(left, right);
                const reply = await interaction.reply({
                    embeds: [deckEmbed, cardEmbed],
                    components: [row],
                    withResponse: true,
                });

                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.ROLL_CLAIM_TIME_LIMIT });
                collector.on('collect', async i => {
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return;}
                    if (i.customId == 'left') page -= 1;
                    if (i.customId == 'right') page += 1;
                    replyMessage = "";
                    if (page < 0) page = deck.length - 1;
                    if (page >= deck.length) page = 0;
                    // update the header
                    deckEmbed.setAuthor({
                        name: `${deckName} (${page + 1}/${deck.length})`,
                        iconURL: target.displayAvatarURL(),
                    });
                    if (deckColor) deckEmbed.setColor(deckColor);
                    cardEmbed = await getCardEmbed(deck[page], target, profileData.deckColor);
                    try {
                        await interaction.editReply({
                            embeds: [deckEmbed, cardEmbed],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }

                });

                collector.on('end', async end => {
                    left.setDisabled(true);
                    right.setDisabled(true);
                    try {
                        await interaction.editReply({
                            embeds: [deckEmbed, cardEmbed],
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                });
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error showing the specified deck: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};

async function getCardEmbed(card, owner, deckColor) {
    const villager = villagers.find(v => v.name == card.name);
    // get villager data
    let charData = await charModel.findOne({ name: villager.name });
    const points = await calculatePoints(charData.numClaims, card.rarity);
    const rank = await getRank(villager.name);
    let personality = villager.personality;
    if (!personality) personality = "Special";
    let gender = villager.gender;
    if (!gender) gender = `:transgender_symbol:`; // edge case for Somebody
    else gender = `:${gender.toLowerCase()}_sign:`;
    // make the message look nice
    const viewEmbed = new EmbedBuilder()
        .setTitle(villager.name)
        .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[card.rarity]}***\n**${points}**  <:bells:1349182767958855853>  |  **${card.level}** <:love:1352200821072199732>\nRanking: #${rank}`)
        .setImage(villager.image_url);
    // set color
    if (deckColor) viewEmbed.setColor(deckColor);
    // update name based on rarity
    if (card.rarity == constants.RARITY_NUMS.FOIL) viewEmbed.setTitle(`<:foil:1414625123536732240> ${villager.name} <:foil:1414625123536732240>`);
    else if (card.rarity == constants.RARITY_NUMS.PRISMATIC) viewEmbed.setTitle(`<:prismatic:1359641457702604800> ${villager.name} <:prismatic:1359641457702604800>`);
    viewEmbed.setFooter({ text: `Belongs to ${owner.displayName}`, iconURL: owner.displayAvatarURL() });
    return viewEmbed;
}