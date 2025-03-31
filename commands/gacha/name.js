const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription("Deck name commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription("Sets the name of the user's deck.")
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The new name for the deck.')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription("Restores the name of the user's deck to its default value."))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            // SET SUBCOMMAND
            if (subCommand == 'set') {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // update the deckname based on user input
                let newName = interaction.options.getString('name');
                if (newName.length > constants.DECK_NAME_CHAR_LIMIT) {
                    await interaction.reply({
                        content: `Custom deck names cannot be more than ${constants.DECK_NAME_CHAR_LIMIT} characters.`,
                        flags: MessageFlags.Ephemeral,
                    })
                }
                else {
                    profileData.deckName = newName;
                    await profileData.save();
                    await interaction.reply(`Your deck name has been changed to **${newName}**.`);
                }
            }
            // CLEAR SUBCOMMAND
            else {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // if necessary, set deckName to null
                if (profileData.deckName != null) {
                    profileData.deckName = null;
                    await profileData.save();
                }
                await interaction.reply({
                    content: `<:resetti:1349263941179674645>: *"${interaction.user}, yer deck name's been reset! Pleasure doin' business with ya!"*`,
                })
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with /name.`);
        }
    },
};