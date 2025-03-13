const { MessageFlags, SlashCommandBuilder } = require('discord.js');
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
        ),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            
            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            if (!cardName) {
                return await interaction.reply({
                    content: "You must specify a card to sell. Use **/mydeck** to view your deck, then try **/sell** followed by the name of the card.",
                    flags: MessageFlags.Ephemeral
                })
            }
            const cardIdx = profileData.cards.findIndex(card => card.name && card.name.toLowerCase() === cardName.toLowerCase());
            if (cardIdx === -1) {
                return await interaction.reply(`No card named **${cardName}** found in your deck. Use **/mydeck** to view your deck.`);
            }
            // TODO: check the weird ones (Carmen, Lulu, Etoile, Renee, Viche)
            const realName = profileData.cards[cardIdx].name;
            const rarity = profileData.cards[cardIdx].rarity;

            // confirm the sale
            await interaction.reply(`Sell your **${realName}**? (y/n)`);
            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 25_000 });

            collector.on('collect', async (m) => {
                if (m.content == 'y') {
                    // calculate bell value
                    let charData = await charModel.findOne({ name: realName });
                    let points = await calculatePoints(charData.numClaims, rarity == constants.RARITIES.FOIL);
                    profileData.cards[cardIdx] = null;
                    profileData.numCards -= 1;
                    profileData.cards = profileData.cards.filter(card => card !== null);
                    profileData.bells += points;
                    profileData.save();
                    interaction.followUp(`**${realName}** sold! (+**${points}** <:bells:1349182767958855853>)`);
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