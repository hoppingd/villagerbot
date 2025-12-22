const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const { getOrCreateProfile, getOrCreateServerData } = require('../../util');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription("Toggle various settings.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('playstyle')
                .setDescription("Toggle between Monodeck (a single, cross-server deck) and Polydeck (one deck per server) playstyles."))
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverprivacy')
                .setDescription("Toggles whether the server name is visible on leaderboards. (ADMIN ONLY)"))
        .addSubcommand(subcommand =>
            subcommand
                .setName('userprivacy')
                .setDescription("Toggles whether your username is visible on leaderboards."))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        if (subCommand == 'playstyle') {
            try {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // build reply
                const confirm = new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success);
                const cancel = new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder()
                    .addComponents(confirm, cancel);
                let messageContent;
                if (profileData.crossServer) messageContent = `<:rover:1354073182629400667>: *"Hey there, ${interaction.user}! You are currently using the* ***Monodeck*** *playstyle, meaning your deck is shared across all servers. Would you like to switch to* ***Polydeck*** *and have a unique deck for each server?"*`;
                else messageContent = `<:rover:1354073182629400667>: *"Hey there, ${interaction.user}! You are currently using the* ***Polydeck*** *playstyle, meaning you have a unique deck for each server. Would you like to switch to* ***Monodeck*** *and share one deck across all servers?"* ⚠️ **WARNING: SWITCHING TO MONODECK WILL CAUSE ALL EXISTING DECKS IN OTHER SERVERS TO BE OVERRIDDEN** ⚠️`;
                const reply = await interaction.reply({
                    content: messageContent,
                    components: [row],
                    withResponse: true,
                });
                // listen with a collector
                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                interaction.client.confirmationState[interaction.user.id] = true;

                collector.on('collect', async i => {
                    try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return; }
                    if (i.user.id != interaction.user.id) return;
                    if (i.customId == 'confirm') {
                        if (profileData.crossServer) {
                            profileData.crossServer = false;
                            await profileData.save();
                            try { await interaction.channel.send(`Your playstyle has been changed to **Polydeck**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        }
                        else {
                            profileData.crossServer = true;
                            await profileData.save();
                            // find all profiles in other servers
                            const otherProfiles = await profileModel.find({
                                userID: profileData.userID,
                                _id: { $ne: profileData._id }
                            });

                            for (const profile of otherProfiles) {
                                for (const card of profile.cards) {
                                    // track the loss of the card in the db
                                    let charData = await charModel.findOne({ name: card.name });
                                    charData.numClaims -= 1;
                                    try { await charData.save(); } catch (err) { console.log(`There was an error updating numClaims: ${err}`); }
                                }
                                for (const card of profile.storage) {
                                    // track the loss of the card in the db
                                    let charData = await charModel.findOne({ name: card.name });
                                    charData.numClaims -= 1;
                                    try { await charData.save(); } catch (err) { console.log(`There was an error updating numClaims: ${err}`); }
                                }
                            }

                            // delete all other profiles
                            await profileModel.deleteMany({
                                userID: profileData.userID,
                                _id: { $ne: profileData._id }
                            });

                            try { await interaction.channel.send(`Your playstyle has been changed to **Monodeck**. If this was accident, please ask for help in the bot's official support server.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        }
                    }
                    else {
                        try { await interaction.followUp(`The operation was cancelled. Your playstyle remains unchanged.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                    collector.stop();
                });

                collector.on('end', async (collected, reason) => {
                    confirm.setDisabled(true);
                    cancel.setDisabled(true);
                    try {
                        await interaction.editReply({
                            content: messageContent,
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                    interaction.client.confirmationState[interaction.user.id] = false;
                    if (reason === 'time') {
                        try { await interaction.followUp(`${interaction.user} did not respond in time. Their playstyle remains unchanged.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                });

            } catch (err) {
                console.log(err);
                try {
                    await interaction.reply(`There was an error changing your playstyle: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
                } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
            }
        }
        // SERVERPRIVACY SUBCOMMAND
        else if (subCommand == 'serverprivacy') {
            try {
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
                    await interaction.reply(`Your server's name will now appear on global leaderboards. To revert this change, use **/toggle serverprivacy**.`);
                }
                else {
                    serverData.isPrivate = true;
                    await serverData.save();
                    await interaction.reply(`Your server's name will now be hidden on global leaderboards. To revert this change, use **/toggle serverprivacy**.`);
                }
            } catch (err) {
                console.log(err);
                try {
                    await interaction.reply(`There was an error with /toggle serverprivacy: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
                } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
            }
        }
        // USERPRIVACY SUBCOMMAND
        else if (subCommand == 'userprivacy') {
            try {
                const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
                // toggle the privacy setting
                const isPrivate = profileData.isPrivate;
                if (isPrivate) {
                    profileData.isPrivate = false;
                    await profileData.save();
                    await interaction.reply(`Your username will now appear on global leaderboards. To revert this change, use **/toggle userprivacy**.`);
                }
                else {
                    profileData.isPrivate = true;
                    await profileData.save();
                    await interaction.reply(`Your username will now be hidden from global leaderboards. To revert this change, use **/toggle userprivacy**.`);
                }
            } catch (err) {
                console.log(err);
                try {
                    await interaction.reply(`There was an error with /toggle userprivacy: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
                } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
            }

        }
    },
};