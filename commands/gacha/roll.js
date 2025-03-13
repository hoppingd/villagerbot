const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/animal-crossing-villagers.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription("Rolls a random villager card."),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id); // still save into profileData, as we may need to know who initially rolled for later features
            // roll a random character // TODO: implement wishes
            let randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
            let villager = villagers[randIdx];
            // determine rarity
            let rarityRoll = Math.floor(Math.random() * 100 + 1);
            let isFoil = rarityRoll <= constants.DEFAULT_FOIL_CHANCE;

            // get card data
            let charData = await charModel.findOne({ name: villager.name });
            let points = await calculatePoints(charData.numClaims, isFoil);
            let rank = await getRank(villager.name);

            // make the message look nice
            const rollEmbed = new EmbedBuilder()
                .setTitle(villager.name)
                .setDescription(`${villager.species}  :${villager.gender.toLowerCase()}_sign: \n*${villager.personality}*\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
                .setImage(villager.image_url);
            try {
                rollEmbed.setColor(villager.title_color);
            }
            catch (err) {
                rollEmbed.setColor("White");
            }
            if (isFoil) {
                rollEmbed.setTitle(`:sparkles: ${villager.name} :sparkles:`);
            }
            const response = await interaction.reply({
                embeds: [rollEmbed],
                withResponse: true,
            });

            const { message } = response.resource;

            // listen for the first reaction within 2 minutes
            const filter = (reaction, reactor) => !reactor.bot;
            const collector = message.createReactionCollector({
                filter,
                time: constants.ROLL_CLAIM_TIME_LIMIT,
            });
            collector.on('collect', async (reaction, reactor) => {
                let reactorData = await getOrCreateProfile(reactor.id, interaction.guild.id);
                // if user already has the card (ignore rarity for now)
                if (reactorData.cards.some(card => card.name === villager.name)) {
                    reactorData.bells += 50;
                    await reactorData.save();
                    collector.stop();
                    rollEmbed.setFooter({ text: `Rent collected by ${reactor.displayName}` });
                    await interaction.editReply({ embeds: [rollEmbed] });
                    await interaction.followUp(`**${reactor.displayName}** collected rent on **${villager.name}**! (+**${points}** <:bells:1349182767958855853>)`);
                }
                // if the user has less cards than their max deck size
                else if (reactorData.numCards < constants.DEFAULT_CARD_LIMIT + reactorData.isaTier) {
                    if (isFoil) reactorData.cards.push({ name: villager.name, rarity: constants.RARITIES.FOIL });
                    else reactorData.cards.push({ name: villager.name, rarity: constants.RARITIES.COMMON });
                    reactorData.numCards += 1;
                    await reactorData.save();
                    collector.stop();
                    rollEmbed.setFooter({ text: `Card claimed by ${reactor.displayName}` });
                    await interaction.editReply({ embeds: [rollEmbed] });
                    await interaction.followUp(`${reactor.displayName} claimed **${villager.name}**!`);
                    // track the claim in the db
                    charData.numClaims += 1;
                    charData.save();
                }
                else {
                    // send a message only visible to the reactor that they couldn't claim because their deck is full
                    await interaction.channel.send(`${reactor}, your deck is full, so you could not claim **${villager.name}**. Try selling a card for Bells using **/sell**, or getting more deck slots with **/upgrade**.`);
                }
                // TODO: factor in storage
            });
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error.`);
        }
    },
};