const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const charModel = require('../../models/charSchema');
const { getOrCreateProfile, calculatePoints } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mydeck')
        .setDescription("Shows the user's deck.")
        .addStringOption(option =>
            option.setName('info')
                .setDescription('Optionally show additional information.')
                .addChoices(
                    { name: "Bells", value: "b" },
                    { name: "Level", value: "l" }
                )
        ),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            if (profileData.cards.length == 0) {
                await interaction.reply(`You have no cards in your deck. Type **/roll** and react to claim some cards!`);
            }
            else {
                // get flags
                const flag = interaction.options.getString('info');
                // get the deck name
                let deckName = profileData.deckName;
                if (deckName == null) deckName = `${interaction.user.displayName}'s Deck`;
                // get the deck color
                let deckColor = profileData.deckColor;
                // get the deck
                let replyMessage = "";
                for (let i = 0; i < profileData.cards.length; i++) {
                    replyMessage += `${profileData.cards[i].name}`;
                    if (profileData.cards[i].rarity == constants.RARITY_NUMS.FOIL) replyMessage += " :sparkles:";
                    if (flag) {
                        replyMessage += " - ";
                        if (flag == "b") {
                            const charData = await charModel.findOne({ name: profileData.cards[i].name });
                            const points = await calculatePoints(charData.numClaims, profileData.cards[i].rarity);
                            replyMessage += `**${points}** <:bells:1349182767958855853>`;
                        }
                        else {
                            replyMessage += `**${profileData.cards[i].level}** <:love:1352200821072199732>`;
                        }
                    }
                    replyMessage += "\n";
                }
                // make the message look nice
                const deckEmbed = new EmbedBuilder()
                    .setTitle(deckName)
                    .setDescription(replyMessage)
                    .setFooter({ text: `${constants.DEFAULT_CARD_LIMIT + profileData.isaTier - profileData.cards.length} card slots remaining.` });
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
            await interaction.reply(`There was an error showing the user's deck.`);
        }
    },
};