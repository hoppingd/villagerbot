const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getOwnershipFooter, getRank, getTimeString } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription("Rolls a random villager card.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id); // still save into profileData, as we may need to know who initially rolled for later features
            // check if the user can roll
            let timeSinceReset = Date.now() - profileData.rechargeTimestamp;
            let shouldReset = timeSinceReset >= constants.DEFAULT_ROLL_TIMER;
            if (profileData.energy > 0 || shouldReset) {
                // replenish the rolls if the roll timer has passed
                if (shouldReset) {
                    let rechargeDate = new Date(Date.now());
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
                return await interaction.reply(`You are out of energy and cannot roll. Your energy will replenish in ${getTimeString(timeRemaining)}. You can also purchase max energy from **Brewster** <:brewster:1349263645380710431> by using **/upgrade**.`)
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

            // villager = villagers.find(v => v.name.toLowerCase() == "skye"); // FOR TESTING TO ROLL CERTAIN CHARACTERS

            // determine rarity
            let rarity = 0;
            const rarityRoll = Math.floor(Math.random() * 100 + 1);
            if (rarityRoll <= constants.DEFAULT_FOIL_CHANCE + profileData.katTier) rarity = 1;

            // get card data
            let charData = await charModel.findOne({ name: villager.name });
            let points = await calculatePoints(charData.numClaims, rarity);
            let rank = await getRank(villager.name);
            let personality = villager.personality;
            if (!personality) personality = "Special";
            let gender = villager.gender;
            if (!gender) gender = `:transgender_symbol:`; // edge case for Somebody
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
            if (rarity == constants.RARITY_NUMS.FOIL) {
                rollEmbed.setTitle(`:sparkles: ${villager.name} :sparkles:`);
            }
            // get card owners and wishers // TODO: sort by lvl so the top levels are displayed
            let cardOwners = [];
            let cardWishers = [];
            const guildProfiles = await profileModel.find({ serverID: interaction.guild.id });
            for (const profile of guildProfiles) {
                for (const card of profile.cards) {
                    if (card.name == villager.name && card.rarity == rarity) {
                        const user = await interaction.client.users.fetch(profile.userID);
                        if (profile.userID == interaction.user.id) cardOwners.unshift(user.displayName);
                        else cardOwners.push(user.displayName);
                    }
                }
                if (profile.wish == villager.name) {
                    const user = await interaction.client.users.fetch(profile.userID);
                    if (profile.userID == interaction.user.id) cardWishers.unshift(user);
                    else cardWishers.push(user);
                }
            }
            // add the ownership footer
            let ownershipFooter = getOwnershipFooter(cardOwners);
            // warn the user if they have just one roll remaining
            if (profileData.energy == 1) ownershipFooter += `\n⚠️ 1 ROLL REMAINING! ⚠️`;
            if (ownershipFooter != "") {
                rollEmbed.setFooter({
                    text: ownershipFooter,
                })
            }
            // add the wish ping
            let wishMessage = "";
            const numWishers = cardWishers.length;
            if (numWishers == 1) wishMessage = `Wished by ${cardWishers[0]}`;
            else if (numWishers == 2) wishMessage = `Wished by ${cardWishers[0]} and ${cardWishers[1]}`;
            else if (numWishers) wishMessage = `Wished by ${cardWishers.slice(0, numWishers - 1).join(", ")}, and ${cardWishers[numWishers - 1]}`;
            // send the embed
            const response = await interaction.reply({
                content: wishMessage,
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
                const reactorCardIdx = reactorData.cards.findIndex(card => card.name === villager.name);
                // if user's claim isn't available
                if (timeSinceClaim < constants.DEFAULT_CLAIM_TIMER) {
                    let timeRemaining = constants.DEFAULT_CLAIM_TIMER - timeSinceClaim;
                    return await interaction.channel.send(`${reactor}, you claimed a card recently. You must wait ${getTimeString(timeRemaining)} before claiming again.`);
                }
                // if user already has the card
                else if (reactorCardIdx != -1) {
                    // if the rarity is lower or equal
                    if (rarity <= reactorData.cards[reactorCardIdx].rarity) {
                        reactorData.cards[reactorCardIdx].level += constants.RARITY_LVL[rarity];
                        reactorData.bells += points;
                        await reactorData.save();
                        collector.stop();
                        await interaction.followUp(`**${reactor.displayName}** collected rent on **${villager.name}**! (+**${points}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[rarity]}** <:love:1352200821072199732> )`);
                    }
                    // if the rarity is higher
                    else {
                        const oldRarity = reactorData.cards[reactorCardIdx].rarity;
                        reactorData.cards[reactorCardIdx].rarity = rarity;
                        reactorData.cards[reactorCardIdx].level += constants.RARITY_LVL[oldRarity];
                        const oldPoints = Math.floor(points / constants.RARITY_VALUE_MULTIPLIER[rarity]) * constants.RARITY_VALUE_MULTIPLIER[oldRarity]; // gets the base value, then finds the value of the card being sold, avoiding another call to calculatePoints()
                        reactorData.bells += oldPoints;
                        // set the claim timestamp
                        let claimDate = new Date(Date.now());
                        let claimHour = Math.floor(claimDate.getHours() / 4) * 4;
                        claimDate.setHours(claimHour);
                        claimDate.setMinutes(0);
                        claimDate.setSeconds(0);
                        claimDate.setMilliseconds(0);
                        reactorData.claimTimestamp = claimDate;
                        let followUpMsg = `**${reactor.displayName}** upgraded their **${villager.name}**! (+**${oldPoints}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[oldRarity]}** <:love:1352200821072199732> )`;
                        if (profileData.nookTier > 1 && reactorData.wish == villager.name) {
                            reactorData.bells += WISH_CLAIM_BONUS; // NOOK II BONUS
                            followUpMsg += ` (+**${WISH_CLAIM_BONUS}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook II**)`
                        }
                        if (profileData.nookTier > 2) {
                            reactorData.bells += points;  // NOOK III BONUS
                            followUpMsg += ` (+**${points}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook III**)`
                        }
                        // wrap up
                        await reactorData.save();
                        collector.stop();
                        await interaction.followUp(followUpMsg);
                    }
                }
                // if the user has less cards than their max deck size
                else if (reactorData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(reactorData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                    reactorData.cards.push({ name: villager.name, rarity: rarity });
                    // set the claim timestamp
                    let claimDate = new Date(Date.now());
                    let claimHour = Math.floor(claimDate.getHours() / 4) * 4;
                    claimDate.setHours(claimHour);
                    claimDate.setMinutes(0);
                    claimDate.setSeconds(0);
                    claimDate.setMilliseconds(0);
                    reactorData.claimTimestamp = claimDate;
                    let followUpMsg = `${reactor.displayName} claimed **${villager.name}**!`;
                    if (profileData.nookTier > 1 && reactorData.wish == villager.name) {
                        reactorData.bells += WISH_CLAIM_BONUS; // NOOK II BONUS
                        followUpMsg += ` (+**${WISH_CLAIM_BONUS}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook II**)`
                    }
                    if (profileData.nookTier > 2) {
                        reactorData.bells += points;  // NOOK III BONUS
                        followUpMsg += ` (+**${points}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook III**)`
                    }
                    // wrap up
                    await reactorData.save();
                    collector.stop();
                    cardOwners.unshift(reactor.displayName);
                    rollEmbed.setFooter({
                        text: getOwnershipFooter(cardOwners),
                    })
                    await interaction.editReply({ content: wishMessage, embeds: [rollEmbed] });
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