const { SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription("Reset's the user's deck."),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            await interaction.reply(`<:resetti:1349263941179674645>: *"Are ye sure ye wanna reset? All yer cards'll be deleted! If yer sure, type* ***'confirm'*** *below!"*`);
            const collectorFilter = m => (m.author.id == interaction.user.id && m.content == 'confirm');
            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 25_000 });

            collector.on('collect', async(m) => {
                for (let card of profileData.cards) {
                    // track the loss of the card in the db
                    let charData = await charModel.findOne({ name: card.name });
                    charData.numClaims -= 1;
                    await charData.save();
                }
                profileData.cards = [];
                profileData.numCards = 0;
                profileData.save();
                interaction.channel.send(`<:resetti:1349263941179674645>: *"${interaction.user}, yer deck's been reset! Best of luck to ya!"*`);
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await interaction.followUp(`<:resetti:1349263941179674645>: *"${interaction.user}, ye didn't confirm in time! What were ye thinkin'?! The reset's been cancelled!"*`);
                }
            });

        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error resetting.`);
        }
    },
};