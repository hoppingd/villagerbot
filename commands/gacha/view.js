const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/animal-crossing-villagers.json');
const constants = require('../../constants');
const { calculatePoints, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription("View a card.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The name of the card to be viewed.')
        )
        .addStringOption(option =>
            option.setName('rarity')
                .setDescription('The rarity of the card to be viewed.')
                .addChoices(
                    { name: "Common", value: "Common" },
                    { name: "Foil", value: "Foil" }
                )
        ),
    async execute(interaction) {
        try {
            // check that a valid card was supplied
            const cardName = interaction.options.getString('card');
            if (!cardName) {
                return await interaction.reply({
                    content: "You must specify a card to view.",
                    flags: MessageFlags.Ephemeral
                })
            }
            const villager = villagers.find(v => v.name.toLowerCase() === cardName.toLowerCase());

            // set isFoil based on rarity arg
            let rarity = interaction.options.getString('rarity');
            let isFoil = false;
            if (rarity) isFoil = rarity.toLowerCase() == constants.RARITIES.FOIL.toLowerCase();

            if (villager) {
                let charData = await charModel.findOne({ name: villager.name });
                let points = await calculatePoints(charData.numClaims, isFoil);
                let rank = await getRank(villager.name);

                // make the message look nice
                const viewEmbed = new EmbedBuilder()
                    .setTitle(villager.name)
                    .setDescription(`${villager.species}  :${villager.gender.toLowerCase()}_sign: \n*${villager.personality}*\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
                    .setImage(villager.image_url);
                try {
                    viewEmbed.setColor(villager.title_color);
                }
                catch (err) {
                    viewEmbed.setColor("White");
                }
                if (isFoil) {
                    viewEmbed.setTitle(`:sparkles: ${villager.name} :sparkles:`);
                }
                await interaction.reply({ embeds: [viewEmbed] });
            }
            else {
                await interaction.reply(`No card named **${cardName}** found. Check your spelling.`);
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with the sale.`);
        }
    },
};