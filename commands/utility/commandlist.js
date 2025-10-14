const { EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandlist')
        .setDescription("Displays info about the bot's commands.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
            .setDescription(`<:rover:1354073182629400667>: *"Here's a list of all the commands!"*\n\n**/balance** - shows the user's Bell balance
                **/claim** - shows the user's claim timer
                **/commandlist** - displays the list of commands
                **/daily** - gives the user a random amount of Bells (NOOK I REQUIRED)
                **/deck** - views a deck in carousel format
                **/decklist** - views a deck in list format
                **/give** - gives a user bells or a card (levels are reset)
                **/help** - displays info about the card collecting game and how it works
                **/leaderboard** - displays various leaderboards
                **/multiroll** - rolls until the user has 0 energy left
                **/name** - sets or clears the user's deck name
                **/ping** - displays the ping between the bot and Discord API
                **/playstyle** - switch between monodeck (a single, cross-server deck) and polydeck (one deck per server) playstyles
                **/private** - toggles whether the user's name or server are visible on global leaderboards
                **/recharge** - replenishes the user's energy daily (BREWSTER V REQUIRED)
                **/reset** - resets the user's progress
                **/resetclaimtimer** - resets the user's claim timer daily (ISABELLE V REQUIRED)
                **/roll** - roll a card
                **/sell** - sell a card for its Bell value
                **/shop** - access a shop with high rarity cards. cards refresh daily and can only be purchased once
                **/sort** - sort your deck
                **/storage** - manage your storage
                **/topcard** - moves a card to the top of your deck
                **/trade** - trades with another user. offered and requested cards must be in list format, separated by commas (i.e. Tom Nook, Isabelle, Rover). order matters, as later cards in the list may be placed into storage
                **/upgrade** - view or purchase upgrades
                **/view** - view a card
                **/vote** - replenishes the user's energy if they have voted in the last 12 hours
                **/wish** - wish for a card. wished cards have a higher chance to be rolled by the person wishing them`);
                await interaction.reply({
                    embeds: [helpEmbed]
                });
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with /commandlist: ${err.name}.  Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};