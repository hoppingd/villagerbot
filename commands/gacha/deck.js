const { EmbedBuilder, InteractionContextType, SlashCommandBuilder, MessageFlags } = require('discord.js');
const constants = require('../../constants');
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
                    { name: "Level", value: "l" }
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
            let profileData = await getOrCreateProfile(target.id, interaction.guild.id);
            if (profileData.cards.length == 0) {
                if (target.id == interaction.user.id) await interaction.reply(`You have no cards in your deck. Type **/roll** and react to claim some cards!`);
                else await interaction.reply(`There are no cards in the specified deck.`);
            }
            else {
                // get flags
                const flag = interaction.options.getString('info');
                // get the deck name
                let deckName = profileData.deckName;
                if (deckName == null) deckName = `${target.displayName}'s Deck`;
                // get the deck color
                let deckColor = profileData.deckColor;
                // get the deck and sort it
                let deck = profileData.cards;
                const sort = interaction.options.getBoolean('sort');
                if (sort) {
                    deck.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0));
                    if (flag == "b") {
                        for (let i = 0; i < deck.length; i++) {
                            const charData = await charModel.findOne({ name: deck[i].name });
                            deck[i].points = await calculatePoints(charData.numClaims, deck[i].rarity);
                        }
                        deck.sort((a, b) => b.points - a.points);
                    }
                    else if (flag == "l") {
                        deck.sort((a, b) => b.level - a.level);
                    }
                }
                // display the deck
                let replyMessage = "";
                for (let i = 0; i < deck.length; i++) {
                    replyMessage += `${deck[i].name}`;
                    if (deck[i].rarity == constants.RARITY_NUMS.FOIL) replyMessage += " :sparkles:";
                    if (flag) {
                        replyMessage += " - ";
                        if (flag == "b") {
                            if (!sort) {
                                const charData = await charModel.findOne({ name: deck[i].name });
                                const points = await calculatePoints(charData.numClaims, deck[i].rarity);
                                replyMessage += `**${points}** <:bells:1349182767958855853>`;
                            }
                            else replyMessage += `**${deck[i].points}** <:bells:1349182767958855853>`;
                        }
                        else {
                            replyMessage += `**${deck[i].level}** <:love:1352200821072199732>`;
                        }
                    }
                    replyMessage += "\n";
                }
                // make the message look nice
                const deckEmbed = new EmbedBuilder()
                    .setTitle(deckName)
                    .setDescription(replyMessage)
                    .setFooter({ text: `${constants.DEFAULT_CARD_LIMIT + profileData.isaTier - deck.length} card slots remaining.` });
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