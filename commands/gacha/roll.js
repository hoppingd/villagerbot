const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription("Rolls a random villager card."),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id); // still save into profileData, as we may need to know who initially rolled for later features
            // check if the user can roll
            let timeSinceReset = Date.now() - profileData.rechargeTimestamp;
            let shouldReset = timeSinceReset >= constants.DEFAULT_ROLL_TIMER;
            if (profileData.energy > 0 || shouldReset) {
                // replenish the rolls if the roll timer has passed
                if (shouldReset == true) {
                    profileData.rechargeTimestamp = Date.now();
                    profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
                }
                profileData.energy -= 1;
                await profileData.save();
            }
            else {
                let timeRemaining = constants.DEFAULT_ROLL_TIMER - timeSinceReset;
                let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
                let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
                let timeString = "";
                if (hoursRemaining > 0) timeString += `**${hoursRemaining} hours** and `;
                timeString += `**${minutesRemaining} minutes**`;
                return await interaction.reply({
                    content: `<:brewster:1349263645380710431>: *"Say... you're out of energy, and that means no rolls. You can get more in ${timeString}, or buy a fresh brew with **/recharge**. You can also get some permanent buffs with **/upgrade**."*`,
                    flags: MessageFlags.Ephemeral,
                })
            }

            let villager;
            // see if the wished character is rolled first
            let wish = profileData.wish;
            if (wish) {
                let randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
                if (randIdx < Math.pow(constants.WISH_BASE, profileData.celTier)) villager = villagers.find(v => v.name.toLowerCase() === wish.toLowerCase());
            }
            // if not, roll a random character
            if (!villager) {
                // roll a random character
                let randIdx = Math.floor(Math.random() * constants.NUM_VILLAGERS);
                villager = villagers[randIdx];
            }
            // determine rarity
            const rarityRoll = Math.floor(Math.random() * 100 + 1);
            const isFoil = rarityRoll <= constants.DEFAULT_FOIL_CHANCE + profileData.katTier;

            // get card data
            let charData = await charModel.findOne({ name: villager.name });
            let points = await calculatePoints(charData.numClaims, isFoil);
            let rank = await getRank(villager.name);
            let personality = villager.personality;
            if (!personality) personality = "Special";
            let gender = villager.gender;
            if (!gender) gender = `:transgender_symbol:`;
            else gender = `:${gender.toLowerCase()}_sign:`;

            // make the message look nice
            const rollEmbed = new EmbedBuilder()
                .setTitle(villager.name)
                .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${isFoil ? constants.RARITIES.FOIL : constants.RARITIES.COMMON}***\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
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
                if (interaction.client.confirmationState[reactor.id]) {
                    // send a message to the reactor that they couldn't claim because they are in the middle of a key operation
                    return interaction.channel.send(`${reactor}, you cannot react to rolls while in the middle of a key operation.`);
                }
                let reactorData = await getOrCreateProfile(reactor.id, interaction.guild.id);
                let timeSinceClaim = Date.now() - reactorData.claimTimestamp;
                // if user's claim isn't available
                if (timeSinceClaim < constants.DEFAULT_CLAIM_TIMER) {
                    let timeRemaining = constants.DEFAULT_CLAIM_TIMER - timeSinceClaim;
                    let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
                    let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
                    let timeString = "";
                    if (hoursRemaining > 0) timeString += `**${hoursRemaining} hours** and `;
                    timeString += `**${minutesRemaining} minutes**`;
                    return await interaction.channel.send(`${reactor}, you claimed a card recently. You must wait ${timeString} before claiming again.`);
                }
                // if user already has the card (ignore rarity for now)
                else if (reactorData.cards.some(card => card.name === villager.name)) {
                    reactorData.bells += 50;
                    await reactorData.save();
                    collector.stop();
                    rollEmbed.setFooter({ text: `Rent collected by ${reactor.displayName}` });
                    await interaction.editReply({ embeds: [rollEmbed] });
                    await interaction.followUp(`**${reactor.displayName}** collected rent on **${villager.name}**! (+**${points}** <:bells:1349182767958855853>)`);
                }
                // if the user has less cards than their max deck size
                else if (reactorData.cards.length < constants.DEFAULT_CARD_LIMIT + reactorData.isaTier) {
                    if (isFoil) reactorData.cards.push({ name: villager.name, rarity: constants.RARITIES.FOIL });
                    else reactorData.cards.push({ name: villager.name, rarity: constants.RARITIES.COMMON });
                    reactorData.claimTimestamp = Date.now();
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
                    // send a message to the reactor that they couldn't claim because their deck is full
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