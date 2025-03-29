const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile } = require('../../util');

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
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);

            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
            const cardIdx = profileData.cards.findIndex(card => card.name.toLowerCase() === normalizedCardName);
            const storageIdx = -1;
            let realName = null;
            let rarity = null;
            if (cardIdx == -1) {
                const storageIdx = profileData.storage.findIndex(card => card.name.toLowerCase() === normalizedCardName);
                // the card is in storage
                if (storageIdx != -1) {
                    realName = profileData.storage[storageIdx].name;
                    rarity = profileData.storage[storageIdx].rarity;
                }
                else return await interaction.reply(`No card named **${cardName}** found in your deck or storage. Use **/deck** to view your deck, and **/storage view** to view your storage.`);
            }
            else {
                realName = profileData.cards[cardIdx].name;
                rarity = profileData.cards[cardIdx].rarity;
            }
            // get the points
            let charData = await charModel.findOne({ name: realName });
            let points = await calculatePoints(charData.numClaims, rarity);
            // confirm the sale
            await interaction.reply(`Sell your **${realName}** for **${points} <:bells:1349182767958855853>**? (y/n)`);
            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
            interaction.client.confirmationState[interaction.user.id] = true;
            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

            collector.on('collect', async (m) => {
                if (m.content == 'y') {
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
                    let followUpMsg = `**${realName}** sold! (+**${points}** <:bells:1349182767958855853>)`;
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
                    profileData.save();
                    interaction.followUp(followUpMsg);
                    // track the sale in the db
                    charData.numClaims -= 1;
                    charData.save();
                }
                else {
                    interaction.followUp(`Sale cancelled.`);
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                interaction.client.confirmationState[interaction.user.id] = false;
                if (reason === 'time') {
                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The sale was cancelled.`);
                }
            });

        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with the sale.`);
        }
    },
};