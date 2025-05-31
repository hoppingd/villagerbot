const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getClaimDate, getOrCreateProfile, getOwnershipFooter, getRank, getRechargeDate, getTimeString } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('multiroll')
        .setDescription("Rolls as much as possible.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            // check if the user can roll
            const timeSinceReset = Date.now() - profileData.rechargeTimestamp;
            const shouldReset = timeSinceReset >= constants.DEFAULT_ROLL_TIMER;
            if (profileData.energy > 0 || shouldReset) {
                // replenish the rolls if the roll timer has passed
                if (shouldReset) {
                    profileData.rechargeTimestamp = getRechargeDate();
                    profileData.energy = constants.DEFAULT_ENERGY + profileData.brewTier;
                }
                await profileData.save();
            }
            else {
                const timeRemaining = constants.DEFAULT_ROLL_TIMER - timeSinceReset;
                return await interaction.reply(`You are out of energy and cannot roll. Your energy will replenish in ${getTimeString(timeRemaining)}. You can also purchase max energy from **Brewster** <:brewster:1349263645380710431> by using **/upgrade**.`);
            }
            if (profileData.energy == 1) { await interaction.reply(`Rolling ${profileData.energy} time for ${interaction.user}.`); }
            else await interaction.reply(`Rolling ${profileData.energy} times for ${interaction.user}.`);
            let energy = profileData.energy;
            interaction.client.confirmationState[interaction.user.id] = true;

            while (energy > 0) {
                energy -= 1;
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
                console.log(`${interaction.user.displayName} rolled ${villager.name}`);
                // villager = villagers.find(v => v.name.toLowerCase() == "skye"); // FOR TESTING TO ROLL CERTAIN CHARACTERS

                // determine rarity
                let rarity = 0;
                const rarityRoll = Math.floor(Math.random() * 100 + 1); // 1-100
                if (rarityRoll <= Math.floor((profileData.tortTier / constants.TORT_PRISMATIC_CHANCE_INTERVAL) + constants.DEFAULT_PRISMATIC_CHANCE)) rarity = 2;
                else if (rarityRoll <= constants.DEFAULT_FOIL_CHANCE + profileData.katTier + Math.floor((profileData.tortTier / constants.TORT_PRISMATIC_CHANCE_INTERVAL) + constants.DEFAULT_PRISMATIC_CHANCE)) rarity = 1;
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
                if (rarity == constants.RARITY_NUMS.FOIL) rollEmbed.setTitle(`:sparkles: ${villager.name} :sparkles:`);
                else if (rarity == constants.RARITY_NUMS.PRISMATIC) rollEmbed.setTitle(`<:prismatic:1359641457702604800> ${villager.name} <:prismatic:1359641457702604800>`);
                // get card owners and wishers
                let cardOwners = [];
                let cardWishers = [];
                const guildProfiles = await profileModel.find({ serverID: interaction.guild.id });
                for (const profile of guildProfiles) {
                    for (const card of profile.cards) {
                        if (card.name == villager.name && card.rarity >= rarity) {
                            const user = await interaction.client.users.fetch(profile.userID);
                            if (profile.userID == interaction.user.id) cardOwners.unshift({ name: user.displayName, level: card.level });
                            else insertSorted(cardOwners, { name: user.displayName, level: card.level });
                        }
                    }
                    if (profile.wish == villager.name) {
                        const user = await interaction.client.users.fetch(profile.userID);
                        if (profile.userID == interaction.user.id) cardWishers.unshift(user);
                        else cardWishers.push(user);
                    }
                }
                // remove the level field so cardOwners only tracks names
                for (let i = 0; i < cardOwners.length; i++) {
                    cardOwners[i] = cardOwners[i].name;
                }
                // add the ownership footer
                let ownershipFooter = getOwnershipFooter(cardOwners);
                // warn the user if they have just one roll remaining
                if (energy == 1) ownershipFooter += `\n⚠️ 1 ROLL REMAINING! ⚠️`;
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
                let response;
                // send the embed
                response = await interaction.followUp({
                    content: wishMessage,
                    embeds: [rollEmbed],
                    withResponse: true,
                });
                // listen for the first reaction within 2 minutes
                const filter = (reaction, reactor) => !reactor.bot;
                const collector = response.createReactionCollector({
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
                    const reactorStorageIdx = reactorData.storage.findIndex(card => card.name === villager.name)
                    // if user's claim isn't available and they aren't claiming a lower rarity of a card they own
                    if (timeSinceClaim < constants.DEFAULT_CLAIM_TIMER) {
                        if (reactorCardIdx == -1 || rarity > reactorData.cards[reactorCardIdx].rarity) {
                            let timeRemaining = constants.DEFAULT_CLAIM_TIMER - timeSinceClaim;
                            try { return await interaction.channel.send(`${reactor}, you claimed a card recently. You must wait ${getTimeString(timeRemaining)} before claiming again.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        }
                    }
                    // if user already has the card
                    if (reactorCardIdx != -1) {
                        // if the rarity is lower or equal
                        if (rarity <= reactorData.cards[reactorCardIdx].rarity) {
                            reactorData.cards[reactorCardIdx].level += constants.RARITY_LVL[rarity];
                            reactorData.bells += points;
                            // upgrade the card if a level threshold was reached
                            if (reactorData.cards[reactorCardIdx].level >= constants.UPGRADE_THRESHOLDS[reactorData.cards[reactorCardIdx].rarity]) {
                                reactorData.cards[reactorCardIdx].rarity += 1;
                                try { await interaction.channel.send(`${reactor}, your **${villager.name}** reached or passed level ${constants.UPGRADE_THRESHOLDS[reactorData.cards[reactorCardIdx].rarity - 1]} and was automatically upgraded to **${constants.RARITY_NAMES[reactorData.cards[reactorCardIdx].rarity]}**!`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                            await reactorData.save();
                            collector.stop();
                            try { await interaction.followUp(`**${reactor.displayName}** collected rent on **${villager.name}**! (+**${points}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[rarity]}** <:love:1352200821072199732>)`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        }
                        // if the rarity is higher
                        else {
                            const oldRarity = reactorData.cards[reactorCardIdx].rarity;
                            reactorData.cards[reactorCardIdx].rarity = rarity;
                            reactorData.cards[reactorCardIdx].level += constants.RARITY_LVL[oldRarity];
                            const oldPoints = Math.floor(points / constants.RARITY_VALUE_MULTIPLIER[rarity]) * constants.RARITY_VALUE_MULTIPLIER[oldRarity]; // gets the base value, then finds the value of the card being sold, avoiding another call to calculatePoints()
                            reactorData.bells += oldPoints;
                            reactorData.claimTimestamp = getClaimDate();
                            let followUpMsg = `**${reactor.displayName}** upgraded their **${villager.name}** to **${constants.RARITY_NAMES[rarity]}**! (+**${oldPoints}** <:bells:1349182767958855853>, +**${constants.RARITY_LVL[oldRarity]}** <:love:1352200821072199732>)`;
                            if (profileData.nookTier > 1 && reactorData.wish == villager.name) {
                                reactorData.bells += constants.WISH_CLAIM_BONUS; // NOOK II BONUS
                                followUpMsg += ` (+**${constants.WISH_CLAIM_BONUS}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook II**)`
                            }
                            if (profileData.nookTier > 2) {
                                reactorData.bells += points;  // NOOK III BONUS
                                followUpMsg += ` (+**${points}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook III**)`
                            }
                            // wrap up
                            await reactorData.save();
                            collector.stop();
                            try { await reaction.message.reply(followUpMsg); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        }
                    }
                    // the user has the card in storage
                    else if (reactorStorageIdx != -1) {
                        try { await interaction.channel.send(`${reactor}, you cannot claim cards you already have in storage. You must first sell the card with **/sell** or move it to your deck with **/storage move**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                    }
                    // if the user has less cards than their max deck size
                    else if (reactorData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(reactorData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                        reactorData.cards.push({ name: villager.name, rarity: rarity });
                        reactorData.claimTimestamp = getClaimDate();
                        let followUpMsg = `${reactor.displayName} claimed **${villager.name}**!`;
                        if (profileData.nookTier > 1 && cardWishers.includes(reactor.displayName)) {
                            reactorData.bells += constants.WISH_CLAIM_BONUS; // NOOK II BONUS
                            followUpMsg += ` (+**${constants.WISH_CLAIM_BONUS}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook II**)`
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
                        try {
                            await reaction.message.edit({ content: wishMessage, embeds: [rollEmbed] });
                            await reaction.message.reply(followUpMsg);
                        } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        // track the claim in the db
                        charData.numClaims += 1;
                        charData.save();
                    }
                    // if user has room in storage
                    else if (reactorData.storage.length < constants.BLATIER_TO_STORAGE_LIMIT[reactorData.blaTier]) {
                        let rarityUpgradeMsg = null;
                        // BLATHERS V BONUS
                        if (reactorData.blaTier == constants.UPGRADE_COSTS.length) {
                            let randIdx = Math.floor(Math.random() * 101);
                            if (randIdx < constants.BLATHERS_BONUS_CHANCE && rarity < constants.RARITY_NAMES.length - 1) { // if the odds hit and the card isn't max rarity
                                rarity += 1;
                                rarityUpgradeMsg = `(Upgraded to **${constants.RARITY_NAMES[rarity]}** by <:blathers:1349263646206857236> **Blathers V**)`;
                            }
                        }
                        // BLATHERS III BONUS
                        if (reactorData.blaTier < 3) reactorData.storage.push({ name: villager.name, rarity: rarity });
                        else {
                            reactorData.storage.push({ name: villager.name, rarity: rarity, level: 1 + constants.BLATHERS_BONUS_LVLS });
                        }
                        reactorData.claimTimestamp = getClaimDate();
                        let followUpMsg = `${reactor.displayName} claimed **${villager.name}**! The card was sent to their storage.`;
                        // NOOK II BONUS
                        if (profileData.nookTier > 1 && cardWishers.includes(reactor.displayName)) {
                            reactorData.bells += constants.WISH_CLAIM_BONUS;
                            followUpMsg += ` (+**${constants.WISH_CLAIM_BONUS}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook II**)`
                        }
                        // NOOK III BONUS
                        if (profileData.nookTier > 2) {
                            reactorData.bells += points;
                            followUpMsg += ` (+**${points}** <:bells:1349182767958855853> from <:tom_nook:1349263649356779562> **Nook III**)`
                        }
                        // BLATHERS III BONUS
                        if (reactorData.blaTier >= 3) {
                            followUpMsg += ` (+**${constants.BLATHERS_BONUS_LVLS}** <:love:1352200821072199732> from <:blathers:1349263646206857236> **Blathers III**)`
                        }
                        // BLATHERS V MESSAGE
                        if (rarityUpgradeMsg) followUpMsg += rarityUpgradeMsg;
                        // wrap up
                        await reactorData.save();
                        collector.stop();
                        try { await reaction.message.reply(followUpMsg); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        // track the claim in the db
                        charData.numClaims += 1;
                        charData.save();
                    }
                    else {
                        // send a message to the reactor that they couldn't claim because their deck is full
                        try { await interaction.channel.send(`${reactor}, your deck is full, so you could not claim **${villager.name}**. Try selling a card for Bells using **/sell**, or getting more deck slots with **/upgrade**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                    }
                });
            }
            profileData.energy = 0;
            await profileData.save();
            interaction.client.confirmationState[interaction.user.id] = false;
        } catch (err) {
            interaction.client.confirmationState[interaction.user.id] = false;
            console.log(err);
            try {
                await interaction.channel.send(`${interaction.user}, there was an error rolling: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
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