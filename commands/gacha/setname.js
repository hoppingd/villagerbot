const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setname')
        .setDescription("Sets the name of the user's deck.")
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The new name for the deck.')
                .setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
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
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error setting the deck name.`);
        }
    },
};