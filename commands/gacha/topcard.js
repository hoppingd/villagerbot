const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topcard')
        .setDescription("Move a card to the top of your deck.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The name of the card to be moved.')
                .setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            
            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
            const cardIdx = profileData.cards.findIndex(card => card.name.toLowerCase() === normalizedCardName);
            if (cardIdx === -1) {
                return await interaction.reply(`No card named **${cardName}** found in your deck. Use **/deck** to view your deck.`);
            }
            const realName = profileData.cards[cardIdx].name;
            const [card] = profileData.cards.splice(cardIdx, 1);
            profileData.cards.unshift(card);
            await profileData.save();
            await interaction.reply(`**${realName}** was successfully moved to the top of your deck.`);
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error moving a card to the top of your deck.`);
        }
    },
};