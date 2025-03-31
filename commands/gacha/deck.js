const { EmbedBuilder, InteractionContextType, SlashCommandBuilder, MessageFlags } = require('discord.js');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');
const charModel = require('../../models/charSchema');
const { getOrCreateProfile, calculatePoints } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription("Shows a user's deck.")
        .addUserOption(option =>
            option.setName('owner')
                .setDescription("The deck's owner (if no owner is specified, your deck will be shown).")
        )
        .addStringOption(option =>
            option.setName('info')
                .setDescription('Show additional information (optional).')
                .addChoices(
                    { name: "Bells", value: "b" },
                    { name: "Gender", value: "g" },
                    { name: "Level", value: "l" },
                    { name: "Personality", value: "p" },
                    { name: "Species", value: "s" }
                )
        )
        .addBooleanOption(option =>
            option.setName('sort')
                .setDescription('Sort the deck (if no additional info was specified, the deck is sorted alphabetically).')
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
                // get preliminary info
                const flag = interaction.options.getString('info');
                let deckName = profileData.deckName;
                if (deckName == null) deckName = `${target.displayName}'s Deck`;
                let deckColor = profileData.deckColor;
                let deck = profileData.cards;
                const topVillager = villagers.find(v => v.name == deck[0].name);
                // sort the deck
                const sort = interaction.options.getBoolean('sort');
                if (sort) {
                    deck.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0));
                    // BELLS
                    if (flag == "b") {
                        for (let i = 0; i < deck.length; i++) {
                            const charData = await charModel.findOne({ name: deck[i].name });
                            deck[i].points = await calculatePoints(charData.numClaims, deck[i].rarity);
                        }
                        deck.sort((a, b) => b.points - a.points);
                    }
                    // GENDER
                    else if (flag == "g") {
                        deck.sort((a, b) => {
                            const genderA = a.gender ?? "Unknown";
                            const genderB = b.gender ?? "Unknown";
                            return genderA < genderB ? -1 : (genderA > genderB ? 1 : 0);
                        });
                    }
                    // LEVEL
                    else if (flag == "l") {
                        deck.sort((a, b) => b.level - a.level);
                    }
                    // PERSONALITY
                    else if (flag == "p") {
                        deck.sort((a, b) => {
                            const personalityA = a.personality ?? "Special";
                            const personalityB = b.personality ?? "Special";
                            return personalityA < personalityB ? -1 : (personalityA > personalityB ? 1 : 0);
                        });
                    }
                    // SPECIES
                    else if (flag == "s") {
                        deck.sort((a, b) => a.species < b.species ? -1 : (a.species > b.species ? 1 : 0));
                    }
                }
                // display the deck
                let replyMessage = "";
                for (let i = 0; i < deck.length; i++) {
                    const cardName = deck[i].name;
                    if (cardName == topVillager.name) replyMessage += `**${cardName}**`; // bold the top card
                    else replyMessage += `${cardName}`;

                    if (deck[i].rarity == constants.RARITY_NUMS.FOIL) replyMessage += " :sparkles:";
                    if (flag) {
                        replyMessage += " - ";
                        // BELLS
                        if (flag == "b") {
                            if (!sort) {
                                const charData = await charModel.findOne({ name: cardName });
                                const points = await calculatePoints(charData.numClaims, deck[i].rarity);
                                replyMessage += `**${points}** <:bells:1349182767958855853>`;
                            }
                            else replyMessage += `**${deck[i].points}** <:bells:1349182767958855853>`;
                        }
                        // GENDER
                        else if (flag == "g") {
                            const villager = villagers.find(v => v.name == cardName);
                            let gender = villager.gender;
                            if (!gender) replyMessage += `:transgender_symbol:`; // edge case for Somebody
                            else replyMessage += `:${gender.toLowerCase()}_sign:`;
                        }
                        // LEVEL
                        else if (flag == "l") {
                            replyMessage += `**${deck[i].level}** <:love:1352200821072199732>`;
                        }
                        // PERSONALITY
                        else if (flag == "p") {
                            const villager = villagers.find(v => v.name == cardName);
                            let personality = villager.personality;
                            if (!personality) replyMessage += `*Special*`;
                            else replyMessage += `*${personality}*`;
                        }
                        // SPECIES
                        else if (flag == "s") {
                            const villager = villagers.find(v => v.name == cardName);
                            replyMessage += `*${villager.species}*`;
                        }
                    }
                    replyMessage += "\n";
                }
                // make the message look nice
                const deckEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: deckName,
                        iconURL: target.displayAvatarURL(),
                    })
                    .setThumbnail(topVillager.image_url)
                    .setDescription(replyMessage)
                    .setFooter({ text: `${constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS) - deck.length} card slots remaining.` });
                try {
                    deckEmbed.setColor(deckColor);
                }
                catch (err) {
                    deckEmbed.setColor("White");
                }
                await interaction.reply({
                    embeds: [deckEmbed]
                });
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error showing the specified deck.`);
        }
    },
};