const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOwnershipFooter, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription("View a card.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The name of the card to be viewed.')
        )
        .addNumberOption(option =>
            option.setName('rarity')
                .setDescription('The rarity of the card to be viewed.')
                .addChoices(
                    { name: "Common", value: 0 },
                    { name: "Foil", value: 1 }
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

            if (villager) {
                // get rarity data
                /*
                let rarityArg = interaction.options.getString('rarity');
                let rarity = 0;
                if (rarityArg == "COMMON") rarity = constants.RARITY_NUMS.COMMON;
                else if (rarityArg == "FOIL") rarity = constants.RARITY_NUMS.FOIL;
                */
                let rarity = interaction.options.getNumber('rarity');
                // get villager data
                let charData = await charModel.findOne({ name: villager.name });
                let points = await calculatePoints(charData.numClaims, rarity);
                let rank = await getRank(villager.name);
                let personality = villager.personality;
                if (!personality) personality = "Special";
                let gender = villager.gender;
                if (!gender) gender = `:transgender_symbol:`;
                else gender = `:${gender.toLowerCase()}_sign:`;
                // make the message look nice
                const viewEmbed = new EmbedBuilder()
                    .setTitle(villager.name)
                    .setDescription(`${villager.species}  ${gender}\n*${personality}* · ***${constants.RARITY_NAMES[rarity]}***\n**${points}**  <:bells:1349182767958855853>\nRanking: #${rank}`)
                    .setImage(villager.image_url);
                try {
                    viewEmbed.setColor(villager.title_color);
                }
                catch (err) {
                    viewEmbed.setColor("White");
                }
                if (rarity == constants.RARITY_NUMS.FOIL) {
                    viewEmbed.setTitle(`:sparkles: ${villager.name} :sparkles:`);
                }
                // add the card ownership footer // TODO: sort by lvl so the top levels are displayed
                let cardOwners = [];
                const guildProfiles = await profileModel.find({ serverID: interaction.guild.id });
                for (const profile of guildProfiles) {
                    for (const card of profile.cards) {
                        if (card.name == villager.name && card.rarity == rarity) {
                            const user = await interaction.client.users.fetch(profile.userID);
                            if (profile.userID == interaction.user.id) cardOwners.unshift(user.displayName);
                            else cardOwners.push(user.displayName);
                        }
                    }
                }
                const ownershipFooter = getOwnershipFooter(cardOwners);
                if (ownershipFooter != "") {
                    viewEmbed.setFooter({
                        text: ownershipFooter,
                    })
                }
                await interaction.reply({ embeds: [viewEmbed] });
            }
            else {
                await interaction.reply(`No card named **${cardName}** found. Check your spelling.`);
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error trying to view the card.`);
        }
    },
};