const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription("Purchase an upgrade, or view your upgrades.")
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of upgrade to be purchased.')
        ),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            let upgradeFlag = interaction.options.getString('type').toLowerCase();
            if (upgradeFlag) {
                // TODO: confirmation
                let currentLevel;
                switch (upgradeFlag) {
                    // CELESTE UPGRADES
                    case "celeste":
                    case "cel":
                    case "c":
                        currentLevel = profileData.celTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:celeste:1349263647121346662>: *"You've already purchased all of my upgrades!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.celTier]) await interaction.reply(`<:celeste:1349263647121346662>: *"Sorry, you don't have enough Bells for that upgrade."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.celTier];
                            profileData.celTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:celeste:1349263647121346662>: *"Upgrade purchased! Your wishes are now more powerful!"*`);
                        }
                        break;
                    // ISABELLE UPGRADES
                    case "isabelle":
                    case "isa":
                    case "i":
                        currentLevel = profileData.isaTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:isabelle:1349263650191315034>: *"You've already purchased all of my upgrades!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.isaTier]) await interaction.reply(`<:isabelle:1349263650191315034>: *"Sorry, you don't have enough Bells for that upgrade."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.isaTier]}** <:bells:1349182767958855853>)`);
                        else {
                            profileData.bells -= constants.UPGRADE_COSTS[profileData.isaTier];
                            profileData.isaTier += 1;
                            await profileData.save();
                            await interaction.reply(`<:isabelle:1349263650191315034>: *"Upgrade purchased! I fixed you up with a new deck slot!"*`);
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
                // TODO: show an embed with info about upgrades and the user's current progress
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error with **/upgrade**.`);
        }
    },
};