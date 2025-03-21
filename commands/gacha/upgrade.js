const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription("Purchase an upgrade, or view your upgrades.")
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of upgrade to be purchased (optional).')
                .addChoices(
                    { name: "Celeste", value: "Celeste" },
                    { name: "Isabelle", value: "Isabelle" },
                    { name: "Katrina", value: "Katrina" }
                ))
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            let upgradeFlag = interaction.options.getString('type');
            if (upgradeFlag) {
                let currentLevel;
                upgradeFlag = upgradeFlag.toLowerCase();
                switch (upgradeFlag) {
                    // BREWSTER UPGRADES
                    case "brewster":
                    case "brew":
                        currentLevel = profileData.brewTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:brewster:1349263645380710431>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.brewTier]) await interaction.reply(`<:brewster:1349263645380710431>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.brewTier];
                            profileData.brewTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:brewster:1349263645380710431>: *"This upgrade may seem a tad expensive at... ${constants.UPGRADE_COSTS[profileData.brewTier - 1]} Bells, but it's well worth it. Here you go, ${interaction.user}. You now have more energy for your rolls."*`);
                        }
                        break;
                    // CELESTE UPGRADES
                    case "celeste":
                    case "cel":
                    case "c":
                        currentLevel = profileData.celTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:celeste:1349263647121346662>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.celTier]) await interaction.reply(`<:celeste:1349263647121346662>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.celTier];
                            profileData.celTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:celeste:1349263647121346662>: *"Upgrade purchased! Your wishes are now more powerful, ${interaction.user}!"*`);
                        }
                        break;
                    // ISABELLE UPGRADES
                    case "isabelle":
                    case "isa":
                    case "i":
                        currentLevel = profileData.isaTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:isabelle:1349263650191315034>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.isaTier]) await interaction.reply(`<:isabelle:1349263650191315034>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.isaTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.isaTier];
                            profileData.isaTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:isabelle:1349263650191315034>: *"Upgrade purchased! I fixed you up with a new deck slot, ${interaction.user}!"*`);
                        }
                        break;
                    // ISABELLE UPGRADES
                    case "katrina":
                    case "kat":
                    case "k":
                        currentLevel = profileData.katTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:katrina:1349263648144625694> *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.katTier]) await interaction.reply(`<:katrina:1349263648144625694>: *"Hmm... it appears you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.katTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.katTier];
                            profileData.katTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:katrina:1349263648144625694>: *"Keeeeeeeeeee hamo-ata... Keeee haaaaaamo-atata... There are higher rarity cards in your future, ${interaction.user}..."*`);
                        }
                        break;
                    // INVALID ARG
                    default:
                        await interaction.reply({
                            content: "Invalid upgrade type. Try **/upgrade** without any arguments to see what kinds of upgrades you can purchase.",
                            flags: MessageFlags.Ephemeral,
                        })
                }
            }
            else {
                let upgradeInfo = "Type **/upgrade** followed by the character you want to purchase an upgrade from. In some cases, character names can be shortened to the first few letters, or even just the first letter. Your current upgrade progress is shown below.\n\n";
                // BREWSTER
                upgradeInfo += `<:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[profileData.brewTier]}** · `;
                if (profileData.brewTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Next level: **${constants.UPGRADE_COSTS[profileData.brewTier]}** <:bells:1349182767958855853> +1 max energy\n`;
                }
                // CELESTE
                upgradeInfo += `<:celeste:1349263647121346662> **Celeste ${constants.ROMAN_NUMERALS[profileData.celTier]}** · `;
                if (profileData.celTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Next level: **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853> x2 wish chance\n`;
                }
                // ISABELLE
                upgradeInfo += `<:isabelle:1349263650191315034> **Isabelle ${constants.ROMAN_NUMERALS[profileData.isaTier]}** · `;
                if (profileData.isaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Next level: **${constants.UPGRADE_COSTS[profileData.isaTier]}** <:bells:1349182767958855853> +1 deck slot\n`;
                }
                // KATRINA
                upgradeInfo += `<:katrina:1349263648144625694> **Katrina ${constants.ROMAN_NUMERALS[profileData.katTier]}** · `;
                if (profileData.katTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Next level: **${constants.UPGRADE_COSTS[profileData.katTier]}** <:bells:1349182767958855853> +1% foil chance\n`;
                }
                const upgradeEmbed = new EmbedBuilder()
                    .setDescription(upgradeInfo);
                await interaction.reply({ embeds: [upgradeEmbed] });
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with **/upgrade**.`);
        }
    },
};