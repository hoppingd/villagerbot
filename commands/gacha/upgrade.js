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
                    { name: "Blathers", value: "bla" },
                    { name: "Brewster", value: "brew" },
                    { name: "Celeste", value: "cel" },
                    { name: "Isabelle", value: "isa" },
                    { name: "Katrina", value: "kat" },
                    { name: "Tom Nook", value: "nook" },
                ))
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            let upgradeFlag = interaction.options.getString('type');
            if (upgradeFlag) {
                let currentLevel;
                switch (upgradeFlag) {
                    // BLATHERS UPGRADES
                    case "bla":
                        await interaction.reply("This upgrade type has not been implemented yet.")
                        break;
                    // BREWSTER UPGRADES
                    case "brew":
                        currentLevel = profileData.brewTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:brewster:1349263645380710431>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.brewTier]) await interaction.reply(`<:brewster:1349263645380710431>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.brewTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[profileData.brewTier]}** for **${constants.UPGRADE_COSTS[profileData.brewTier]}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState.delete(interaction.user.id), 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.brewTier];
                                    profileData.brewTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:brewster:1349263645380710431>: *"This upgrade may seem a tad expensive at... ${constants.UPGRADE_COSTS[profileData.brewTier - 1]} Bells, but it's well worth it. Here you go, ${interaction.user}. You now have more energy for your rolls."*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState.delete(interaction.user.id);
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // CELESTE UPGRADES
                    case "cel":
                        currentLevel = profileData.celTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:celeste:1349263647121346662>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.celTier]) await interaction.reply(`<:celeste:1349263647121346662>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:celeste:1349263647121346662> **Celeste ${constants.ROMAN_NUMERALS[profileData.celTier]}** for **${constants.UPGRADE_COSTS[profileData.celTier]}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState.delete(interaction.user.id), 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.celTier];
                                    profileData.celTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:celeste:1349263647121346662>: *"Upgrade purchased! Your wishes are now more powerful, ${interaction.user}!"*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState.delete(interaction.user.id);
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // ISABELLE UPGRADES
                    case "isa":
                        currentLevel = profileData.isaTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:isabelle:1349263650191315034>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.isaTier]) await interaction.reply(`<:isabelle:1349263650191315034>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.isaTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:isabelle:1349263650191315034> **Isabelle ${constants.ROMAN_NUMERALS[profileData.isaTier]}** for **${constants.UPGRADE_COSTS[profileData.isaTier]}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState.delete(interaction.user.id), 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.isaTier];
                                    profileData.isaTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:isabelle:1349263650191315034>: *"Upgrade purchased! I fixed you up with a new deck slot, ${interaction.user}!"*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState.delete(interaction.user.id);
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // KATRINA UPGRADES
                    case "kat":
                        currentLevel = profileData.katTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:katrina:1349263648144625694> *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.katTier]) await interaction.reply(`<:katrina:1349263648144625694>: *"Hmm... it appears you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.katTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:katrina:1349263648144625694> **Katrina ${constants.ROMAN_NUMERALS[profileData.katTier]}** for **${constants.UPGRADE_COSTS[profileData.katTier]}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState.delete(interaction.user.id), 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.katTier];
                                    profileData.katTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:katrina:1349263648144625694>: *"Keeeeeeeeeee hamo-ata... Keeee haaaaaamo-atata... There are higher rarity cards in your future, ${interaction.user}..."*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState.delete(interaction.user.id);
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // NOOK UPGRADES
                    case "nook":
                        await interaction.reply("This upgrade type has not been implemented yet.")
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
                let upgradeInfo = "Type **/upgrade**, then choose the character you want to purchase an upgrade from. Your current upgrade progress is shown below.\n\n";
                // BLATHERS
                upgradeInfo += `<:blathers:1349263646206857236> **Blathers ${constants.ROMAN_NUMERALS[profileData.blaTier]}** · `;
                if (profileData.blaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `NOT YET IMPLEMENTED\n`;
                }
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
                // NOOK
                upgradeInfo += `<:tom_nook:1349263649356779562> **Tom Nook ${constants.ROMAN_NUMERALS[profileData.nookTier]}** · `;
                if (profileData.blaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `NOT YET IMPLEMENTED\n`;
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