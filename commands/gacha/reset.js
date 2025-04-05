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
            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, constants.CONFIRM_TIME_LIMIT);

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
                    interaction.channel.send(`<:resetti:1349263941179674645>: *"${interaction.user}, yer deck's been reset! Best of luck to ya!"*`);
                }
                else {
                    await interaction.followUp(`<:resetti:1349263941179674645>: *"${interaction.user}, the reset's been cancelled! That was a close one!"*`);
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                interaction.client.confirmationState[interaction.user.id] = false;
                if (reason === 'time') {
                    await interaction.followUp(`<:resetti:1349263941179674645>: *"${interaction.user}, ye didn't confirm in time! What were ye thinkin'?! The reset's been cancelled!"*`);
                }
            });

        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error resetting: ${err.name}.`);
        }
    },
};