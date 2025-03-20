const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getRank, getCurrentTime } = require('../../util');

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
                    let rechargeDate;
                    try { rechargeDate = await getCurrentTime(); } catch (error) { console.log(error); }
                    rechargeDate.setMinutes(0);
                    rechargeDate.setSeconds(0);
                    rechargeDate.setMilliseconds(0);
                    profileData.rechargeTimestamp = rechargeDate;
                    profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
                }
                profileData.energy -= 1;
                await profileData.save();
            }
            else {
                let timeRemaining = constants.DEFAULT_ROLL_TIMER - timeSinceReset;
                let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
                let minutesRemaining = Math.ceil((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
                if (minutesRemaining == 60) {
                    hoursRemaining += 1;
                    minutesRemaining = 0;
                }
                let timeString = "";
                if (hoursRemaining > 0) timeString += `**${hoursRemaining} hours** and `;
                timeString += `**${minutesRemaining} minutes**`;
                return await interaction.reply({
                    content: `You are out of energy and cannot roll. Your energy will replenish in ${timeString}. You can also purchase max energy from **Brewster** <:brewster:1349263645380710431> by using **/upgrade**.`,
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
            let rarity = 0;
            const rarityRoll = Math.floor(Math.random() * 100 + 1);
            if (rarityRoll <= constants.DEFAULT_FOIL_CHANCE + profileData.katTier) rarity = 1;

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
                .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[rarity]}***\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
                .setImage(villager.image_url);
            try {
                rollEmbed.setColor(villager.title_color);
            }
            catch (err) {
                rollEmbed.setColor("White");
            }
            if (constants.RARITY_NUMS.FOIL) {
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
                let claimDate;
                try { claimDate = await getCurrentTime(); } catch (error) { console.log(error); }
                let timeSinceClaim = claimDate - reactorData.claimTimestamp;
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
                // if user already has the card
                else if (reactorData.cards.some(card => card.name === villager.name)) {
                    // if the rarity is lower or equal
                    reactorData.bells += points;
                    await reactorData.save();
                    collector.stop();
                    rollEmbed.setFooter({ text: `Rent collected by ${reactor.displayName}` });
                    await interaction.editReply({ embeds: [rollEmbed] });
                    await interaction.followUp(`**${reactor.displayName}** collected rent on **${villager.name}**! (+**${points}** <:bells:1349182767958855853>)`);
                    // TODO: if the rarity is higher
                }
                // if the user has less cards than their max deck size
                else if (reactorData.cards.length < constants.DEFAULT_CARD_LIMIT + reactorData.isaTier) {
                    reactorData.cards.push({ name: villager.name, rarity: rarity });
                    // set the claim timestamp
                    let claimHour = Math.floor(claimDate.getHours() / 4) * 4;
                    claimDate.setHours(claimHour);
                    claimDate.setMinutes(0);
                    claimDate.setSeconds(0);
                    claimDate.setMilliseconds(0);
                    reactorData.claimTimestamp = claimDate;
                    // wrap up
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