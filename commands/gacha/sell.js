const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const { calculatePoints, getOrCreateProfile } = require('../../util');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription("Sell a card for its Bell value.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The name of the card to be sold.')
                .setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);

            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "");
            const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(".", "") === normalizedCardName);
            if (!villager) return await interaction.reply(`No card named **${cardName}** found in your deck or storage. Use **/deck** to view your deck, and **/storage view** to view your storage.`);
            const cardIdx = profileData.cards.findIndex(card => card.name == villager.name);
            const storageIdx = profileData.storage.findIndex(card => card.name == villager.name);
            let rarity = null;
            if (cardIdx == -1) {
                // the card is in storage
                if (storageIdx != -1) {
                    rarity = profileData.storage[storageIdx].rarity;
                }
                else return await interaction.reply(`No card named **${cardName}** found in your deck or storage. Use **/deck** to view your deck, and **/storage view** to view your storage.`);
            }
            else {
                rarity = profileData.cards[cardIdx].rarity;
            }
            // get the points
            let charData = await charModel.findOne({ name: villager.name });
            const points = await calculatePoints(charData.numClaims, rarity);
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
            const messageContent = `Sell your **${villager.name}** for **${points} <:bells:1349182767958855853>**?`;
            const reply = await interaction.reply({
                content: messageContent,
                components: [row],
                withResponse: true,
            });
            // listen with a collector
            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
            interaction.client.confirmationState[interaction.user.id] = true;

            collector.on('collect', async i => {
                i.deferUpdate();
                if (i.user.id != interaction.user.id) return;
                if (i.customId == 'yes') {
                    if (storageIdx != -1) {
                        profileData.storage[storageIdx] = null;
                        profileData.storage = profileData.storage.filter(card => card !== null);
                        profileData.bells += points;
                    }
                    else {
                        profileData.cards[cardIdx] = null;
                        profileData.cards = profileData.cards.filter(card => card !== null);
                        profileData.bells += points;
                    }
                    let followUpMsg = `**${villager.name}** sold! (+**${points}** <:bells:1349182767958855853>)`;
                    // NOOK IV BONUS
                    if (profileData.nookTier > 3) {
                        const nookBonus = Math.ceil(points / 2);
                        profileData.bells += nookBonus;
                        followUpMsg += ` (+**${nookBonus}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook IV**)`
                    }
                    // BLATHERS II BONUS
                    if (profileData.blaTier > 2 && storageIdx != -1) {
                        const blaBonus = Math.ceil(points / 2);
                        profileData.bells += blaBonus;
                        followUpMsg += ` (+**${blaBonus}** <:bells:1349182767958855853> from <:blathers:1349263646206857236> **Blathers II**)`
                    }
                    try { await profileData.save(); } catch (err) { console.log(`The was an error updating the user profile in /sell: : ${err}`); collector.stop(); return;}
                    try { await interaction.followUp(followUpMsg); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    // track the sale in the db
                    charData.numClaims -= 1;
                    try { await charData.save(); } catch (err) { console.log(`There was an error updating numClaims: ${err}`); }
                }
                else {
                    try { await interaction.followUp(`Sale cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
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
                    try { await interaction.followUp(`${interaction.user}, you didn't confirm the sale in time. The sale was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                }
            });

        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with the sale: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};