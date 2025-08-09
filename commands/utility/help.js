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
            .setDescription(`<:rover:1354073182629400667>: *"Hi there! My name's **Rover!** Have you used this bot before? If not, no worries. I can explain everything!*"\n\n*"**Villager Bot** adds a trading card game to your server, where you can claim villager cards and trade them with your friends. Use the **/roll** command to roll a random card, and react to it within ${constants.ROLL_CLAIM_TIME_LIMIT / (1000*60)} minutes to claim it. **You can claim one card every ${constants.DEFAULT_CLAIM_TIMER / (1000*60*60)} hours**. The number of times you can roll per hour is determined by your **energy**. You start with ${constants.DEFAULT_ENERGY} energy, but this number can be increased through upgrades."*\n\n*"Every card is worth a certain amount of **Bells** <:bells:1349182767958855853> based on its popularity and rarity. You can sell a card for its Bell value using **/sell**. Bells can be used to buy upgrades from a variety of characters."*\n\n*"Every owned card also has a **Level** <:love:1352200821072199732>. If you claim a card you already own, it will be leveled up. Leveling up a card can result in an automatic rarity upgrade (Level ${constants.UPGRADE_THRESHOLDS[constants.RARITY_NUMS.COMMON]} for **${constants.RARITY_NAMES[constants.RARITY_NUMS.FOIL]}** :sparkles: and Level ${constants.UPGRADE_THRESHOLDS[constants.RARITY_NUMS.FOIL]} for **${constants.RARITY_NAMES[constants.RARITY_NUMS.PRISMATIC]}** <:prismatic:1359641457702604800>). In the future, very high level cards will upgrade to an exclusive rarity with custom community art!"*\n\n*"If you claim a higher rarity version of a card you own, the lower rarity copy will be sold, and its levels will be transferred to the new copy. If you claim a lower rarity version of a card you own, you will 'collect rent', gaining the card's Bell Value and leveling up your copy. Collecting rent has no cooldown, so collect away!"*\n\n*"When you have a full deck, claimed cards enter your storage, assuming there is room. You can transfer them to your deck using **/storage move**. Cards can only be moved out of storage, not in. Cards in storage cannot be leveled up. You can also wish for a card using **/wish**. Wishing for a card increases your chances of rolling it."*\n\n*"For more details, try using **/commandlist**. Happy trading!"*`);
                await interaction.reply({
                    embeds: [helpEmbed]
                });
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with /help: ${err.name}.  Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};