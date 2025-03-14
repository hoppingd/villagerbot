const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
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
            const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "");
            const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName);

            // set isFoil based on rarity arg
            let rarity = interaction.options.getString('rarity');
            let isFoil = false;
            if (rarity) isFoil = rarity.toLowerCase() == constants.RARITIES.FOIL.toLowerCase();
            
            if (villager) {
                let charData = await charModel.findOne({ name: villager.name });
                let points = await calculatePoints(charData.numClaims, isFoil);
                let rank = await getRank(villager.name);
                let personality = villager.personality;
                if (!personality) personality = "Special";
                let gender = villager.gender;
                if (!gender) gender = `:transgender_symbol:`;
                else gender = `:${gender.toLowerCase()}_sign:`;
                // make the message look nice
                const viewEmbed = new EmbedBuilder()
                    .setTitle(villager.name)
                    .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${isFoil ? constants.RARITIES.FOIL : constants.RARITIES.COMMON}***\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
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