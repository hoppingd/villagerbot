const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription("Displays info about the card collecting game and how it works.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
            .setDescription(`<:rover:1354073182629400667>: *"Hi there! My name's **Rover!** Have you used this bot before? If not, no worries. I can explain everything!*"

                *"**Rover Bot** adds a trading card game to your server, where you can claim villager cards and trade them with your friends. Use the **/roll** command to roll a random card, and react to it to claim it. **You can claim one card every ${constants.DEFAULT_CLAIM_TIMER / (1000*60*60)} hours**. The number of times you can roll per hour is determined by your **energy**. You start with ${constants.DEFAULT_ENERGY} energy, but this number can be increased through upgrades."*

                *"Every card is worth a certain amount of **Bells** <:bells:1349182767958855853> based on its popularity and rarity. You can sell a card for its Bell value using **/sell**. Bells can be used to buy upgrades from a variety of characters."*
                
                *"Every owned card also has a **Level** <:love:1352200821072199732>. If you claim a card you already own, it will be leveled up. Leveling up a card can result in an automatic rarity upgrade as well as access to an exclusive rarity. If the claimed card is a higher rarity than the one you own, the lower rarity copy will be automatically sold, and its levels will be transferred to the new copy. If the claimed card is a lower rarity, you will 'collect rent' on them, gaining the card's Bell Value and leveling up your copy."*
                
                *"When you have a full deck, claimed cards enter your storage, assuming there is room. You can transfer them to your deck using **/storage move**. Cards can only be moved out of storage, not in. Cards in storage cannot be leveled up. You can also wish for a card using **/wish**. Wishing for a card increases your chances of rolling it."*
                
                *"For more details, try using **/commandlist**. Happy trading!"*`);
                await interaction.reply({
                    embeds: [helpEmbed]
                });
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with /help.`);
        }
    },
};