const { Colors, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription("Deck color commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription("Sets the color of the user's deck.")
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Hex or color string (only some are accepted).')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription("Restores the color of the user's deck to its default value."))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            // SET SUBCOMMAND
            if (subCommand == 'set') {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // update the deckcolor based on user input
                let newColor = interaction.options.getString('color');
                // clean up input
                newColor.trim();
                if (newColor.startsWith('0x')) newColor = '#' + newColor.slice(2);
                if (/^[0-9A-Fa-f]{6}$/.test(newColor)) newColor = '#' + newColor;
                const hexRegex = /^#([A-Fa-f0-9]{6})$/;
                // validate
                if (hexRegex.test(newColor)) {
                    // valid hex string
                }
                else {
                    const upperColor = newColor.toUpperCase().replace(/\s+/g, '');
                    const realColor = Object.keys(Colors).find(color => color.toUpperCase() === upperColor);
                    if (realColor) {
                        newColor = realColor;
                    }
                    else {
                        return await interaction.reply({
                            content: `Invalid input. Try using a hex code.`,
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                }
                // make sure it works
                const testEmbed = new EmbedBuilder();
                try { testEmbed.setColor(newColor); }
                catch (err) {
                    return await interaction.reply({
                        content: `Your input passed the bot's validation, but was not accepted as an embed color.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
                profileData.deckColor = newColor;
                await profileData.save();
                await interaction.reply(`Your deck color has been updated!`);
            }
            // CLEAR SUBCOMMAND
            else {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // if necessary, set deckColor to default
                if (profileData.deckColor) {
                    profileData.deckColor = null;
                    await profileData.save();
                }
                await interaction.reply({
                    content: `<:resetti:1349263941179674645>: *"${interaction.user}, yer deck color's been reset! Pleasure doin' business with ya!"*`,
                })
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with /color: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};