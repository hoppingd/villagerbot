const { InteractionContextType, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const { getOrCreateProfile } = require('../../util');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription("Reset's the user's deck.")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            await interaction.reply(`<:resetti:1349263941179674645>: *"${interaction.user}, are ye sure ye wanna reset? All yer cards'll be deleted! If yer sure, type* ***'confirm'*** *below! If yer not, type* ***'cancel'**!"*`);
            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content.toLowerCase() == 'confirm' || m.content.toLowerCase() == 'cancel'));
            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: constants.CONFIRM_TIME_LIMIT });
            interaction.client.confirmationState[interaction.user.id] = true;

            collector.on('collect', async(m) => {
                if (m.content.toLowerCase() == 'confirm') {
                    for (const card of profileData.cards) {
                        // track the loss of the card in the db
                        let charData = await charModel.findOne({ name: card.name });
                        charData.numClaims -= 1;
                        await charData.save();
                    }
                    for (const card of profileData.storage) {
                        // track the loss of the card in the db
                        let charData = await charModel.findOne({ name: card.name });
                        charData.numClaims -= 1;
                        await charData.save();
                    }
                    profileData.cards = [];
                    profileData.storage = [];
                    profileData.save();
                    try { await interaction.channel.send(`<:resetti:1349263941179674645>: *"${interaction.user}, yer deck's been reset! Best of luck to ya!"*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                }
                else {
                    try { await interaction.followUp(`<:resetti:1349263941179674645>: *"${interaction.user}, the reset's been cancelled! That was a close one!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                interaction.client.confirmationState[interaction.user.id] = false;
                if (reason === 'time') {
                    try { await interaction.followUp(`<:resetti:1349263941179674645>: *"${interaction.user}, ye didn't confirm in time! What were ye thinkin'?! The reset's been cancelled!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                }
            });

        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error resetting: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};