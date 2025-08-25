const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile, getOrCreateServerData } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('private')
        .setDescription("Toggle privacy settings.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription("Toggles whether your username is visible on leaderboards."))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription("Toggles whether the server name is visible on leaderboards. (ADMIN ONLY)"))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            // USER SUBCOMMAND
            if (subCommand == 'user') {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // toggle the privacy setting
                const isPrivate = profileData.isPrivate;
                if (isPrivate) {
                    profileData.isPrivate = false;
                    await profileData.save();
                    await interaction.reply(`Your username will now appear on global leaderboards. To revert this change, use **/private user**.`);
                }
                else {
                    profileData.isPrivate = true;
                    await profileData.save();
                    await interaction.reply(`Your username will now be hidden from global leaderboards. To revert this change, use **/private user**.`);
                }
            }
            // SERVER SUBCOMMAND
            else {
                // Check if the user is the server owner
                if (interaction.user.id != interaction.guild.ownerId) {
                    return await interaction.reply({
                        content: "Only the server owner can use this command.",
                        ephemeral: true
                    });
                }

                const serverData = await getOrCreateServerData(interaction.guild.id);
                // toggle the privacy setting
                const isPrivate = serverData.isPrivate;
                if (isPrivate) {
                    serverData.isPrivate = false;
                    await serverData.save();
                    await interaction.reply(`Your server's name will now appear on global leaderboards. To revert this change, use **/private server**.`);
                }
                else {
                    serverData.isPrivate = true;
                    await serverData.save();
                    await interaction.reply(`Your server's name will now be hidden on global leaderboards. To revert this change, use **/private server**.`);
                }
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with /private: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};