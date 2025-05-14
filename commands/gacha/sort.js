const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile, calculatePoints } = require('../../util');
const charModel = require('../../models/charSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sort')
        .setDescription("Sort your deck.")
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to sort by.')
                .addChoices(
                    { name: "Alphabetical", value: "a" },
                    { name: "Bells", value: "b" },
                    { name: "Level", value: "l" },
                    { name: "Random", value: "rand" },
                    { name: "Rarity", value: "rar" },
                )
                .setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            if (profileData.cards.length == 0) {
                await interaction.reply(`You have no cards in your deck to sort.`);
            }
            else {
                const category = interaction.options.getString('category');
                if (category == "a") {
                    profileData.cards.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0));
                }
                else if (category == "b") {
                    for (let i = 0; i < profileData.cards.length; i++) {
                        const charData = await charModel.findOne({ name: profileData.cards[i].name });
                        profileData.cards[i].points = await calculatePoints(charData.numClaims, profileData.cards[i].rarity);
                    }
                    profileData.cards.sort((a, b) => b.points - a.points);
                    profileData.cards.forEach(card => {
                        delete card.points;
                    });
                }
                else if (category == "l") {
                    deck.sort((a, b) => b.level - a.level);
                }
                else if (category == "rand") {
                    // Fisher-Yates Shuffle
                    for (let i = profileData.cards.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [profileData.cards[i], profileData.cards[j]] = [profileData.cards[j], profileData.cards[i]];
                    }
                }
                else if (category == "rar") {
                    deck.sort((a, b) => b.rarity - a.rarity);
                }
                await profileData.save();
                if (category == "a") await interaction.reply(`Your deck has been sorted alphabetically.`);
                else if (category == "b") await interaction.reply(`Your deck has been sorted by Bells <:bells:1349182767958855853>.`);
                else if (category == "l") await interaction.reply(`Your deck has been sorted by Level <:love:1352200821072199732>.`);
                else if (category == "rand") await interaction.reply(`Your deck has been shuffled randomly.`);
                else if (category == "rar") await interaction.reply(`Your deck has been sorted by rarity.`);
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error sorting your deck: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};