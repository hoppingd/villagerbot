const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Upgrade commands.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current upgrades.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Purchase an upgrade.')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of upgrade to be purchased.')
                        .addChoices(
                            { name: "Blathers", value: "bla" },
                            { name: "Brewster", value: "brew" },
                            { name: "Celeste", value: "cel" },
                            { name: "Isabelle", value: "isa" },
                            { name: "Katrina", value: "kat" },
                            { name: "Nook", value: "nook" },
                        )
                        .setRequired(true)))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const subCommand = interaction.options.getSubcommand();
            // BUY SUBCOMMAND
            if (subCommand == 'buy') {
                const upgradeFlag = interaction.options.getString('type');
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
                        else if (profileData.bells < getUpgradeCost(profileData.brewTier, profileData.nookTier)) await interaction.reply(`<:brewster:1349263645380710431>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[profileData.brewTier]}** for **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= getUpgradeCost(profileData.brewTier, profileData.nookTier);
                                    profileData.brewTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:brewster:1349263645380710431>: *"This upgrade may seem a tad expensive at... ${getUpgradeCost(profileData.brewTier - 1, profileData.nookTier)} Bells, but it's well worth it. Here you go, ${interaction.user}. You now have more energy for your rolls."*`);
                                    if (profileData.brewTier == constants.UPGRADE_COSTS.length) await interaction.channel.send(`<:brewster:1349263645380710431>: *"Thanks for buying all of my upgrades, ${interaction.user}. Feel free to stop by the Roost with* ***/recharge***. I'll serve you a fresh brew that resets your rolls once per day."*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState[interaction.user.id] = false;
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
                        else if (profileData.bells < getUpgradeCost(profileData.celTier, profileData.nookTier)) await interaction.reply(`<:celeste:1349263647121346662>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.celTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:celeste:1349263647121346662> **Celeste ${constants.ROMAN_NUMERALS[profileData.celTier]}** for **${getUpgradeCost(profileData.celTier, profileData.nookTier)}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= getUpgradeCost(profileData.celTier, profileData.nookTier);
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
                                interaction.client.confirmationState[interaction.user.id] = false;
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
                        else if (profileData.bells < getUpgradeCost(profileData.isaTier, profileData.nookTier)) await interaction.reply(`<:isabelle:1349263650191315034>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:isabelle:1349263650191315034> **Isabelle ${constants.ROMAN_NUMERALS[profileData.isaTier]}** for **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= getUpgradeCost(profileData.isaTier, profileData.nookTier);
                                    profileData.isaTier += 1;
                                    await profileData.save();
                                    if (profileData.isaTier < constants.UPGRADE_COSTS.length) await interaction.followUp(`<:isabelle:1349263650191315034>: *"Upgrade purchased! I fixed you up with a new deck slot, ${interaction.user}!"*`);
                                    else await interaction.followUp(`<:isabelle:1349263650191315034>: *"Upgrade purchased! ${interaction.user}, you can now use* ***/resetclaimtimer**! I can refresh your ability to claim cards, but only once per day."*`);
                                }
                                else {
                                    interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState[interaction.user.id] = false;
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
                        else if (profileData.bells < getUpgradeCost(profileData.katTier, profileData.nookTier)) await interaction.reply(`<:katrina:1349263648144625694>: *"Hmm... it appears you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.katTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:katrina:1349263648144625694> **Katrina ${constants.ROMAN_NUMERALS[profileData.katTier]}** for **${getUpgradeCost(profileData.katTier, profileData.nookTier)}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= getUpgradeCost(profileData.katTier, profileData.nookTier);
                                    profileData.katTier += 1;
                                    await profileData.save();
                                    await interaction.followUp(`<:katrina:1349263648144625694>: *"Keeeeeeeeeee hamo-ata... Keeee haaaaaamo-atata... There are higher rarity cards in your future, ${interaction.user}..."*`);
                                }
                                else {
                                    await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // NOOK UPGRADES
                    case "nook":
                        currentLevel = profileData.nookTier;
                        if (currentLevel == constants.UPGRADE_COSTS.length) await interaction.reply(`<:tom_nook:1349263649356779562>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.katTier, profileData.nookTier)) await interaction.reply(`<:tom_nook:1349263649356779562>: *"You need more Bells, yes? Come back when you have more, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // confirm the purchase
                            await interaction.reply(`Purchase <:tom_nook:1349263649356779562> **Nook ${constants.ROMAN_NUMERALS[profileData.nookTier]}** for **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853> ? (y/n)`);
                            const collectorFilter = m => (m.author.id == interaction.user.id && (m.content == 'y' || m.content == 'n'));
                            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 30_000 });
                            interaction.client.confirmationState[interaction.user.id] = true;
                            setTimeout(() => interaction.client.confirmationState[interaction.user.id] = false, 30_000);

                            collector.on('collect', async (m) => {
                                if (m.content == 'y') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.nookTier];
                                    profileData.nookTier += 1;
                                    await profileData.save();
                                    if (profileData.nookTier == 1) await interaction.followUp(`<:tom_nook:1349263649356779562>: *"The Bank of Nook is now open, ${interaction.user}! Yes, yes, the* ***/daily*** *command... use it to recieve a gift of Bells from yours truly! How generous of me, hm?"*`);
                                    else await interaction.followUp(`<:tom_nook:1349263649356779562>: *"Thank you for your purchase, ${interaction.user}! Enjoy the upgrade, yes?"*`);
                                }
                                else {
                                    await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`);
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    await interaction.followUp(`${interaction.user}, you didn't type 'y' or 'n' in time. The upgrade purchase was cancelled.`);
                                }
                            });
                        }
                        break;
                    // INVALID ARG
                    default:
                        await interaction.reply({
                            content: "Invalid upgrade type. Try **/upgrade view** to see what kinds of upgrades you can purchase.",
                            flags: MessageFlags.Ephemeral,
                        })
                }
            }
            // VIEW SUBCOMMAND
            else {
                let upgradeInfo = "Type **/upgrade buy**, then choose the character you want to purchase an upgrade from. Your current upgrade progress is shown below.\n\n";
                // BLATHERS
                upgradeInfo += `<:blathers:1349263646206857236> **Blathers ${constants.ROMAN_NUMERALS[profileData.blaTier]}** · `;
                if (profileData.blaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.blaTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: +1 storage slot\n`;
                }
                // BREWSTER
                upgradeInfo += `<:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[profileData.brewTier]}** · `;
                if (profileData.brewTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else if (profileData.brewTier == constants.UPGRADE_COSTS.length - 1) upgradeInfo += `Cost: **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: +1 max energy, /recharge\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: +1 max energy\n`;
                }
                // CELESTE
                upgradeInfo += `<:celeste:1349263647121346662> **Celeste ${constants.ROMAN_NUMERALS[profileData.celTier]}** · `;
                if (profileData.celTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.celTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: x2 wish chance\n`;
                }
                // ISABELLE
                upgradeInfo += `<:isabelle:1349263650191315034> **Isabelle ${constants.ROMAN_NUMERALS[profileData.isaTier]}** · `;
                if (profileData.isaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else if (profileData.isaTier == constants.UPGRADE_COSTS.length - 1) upgradeInfo += `Cost: **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: /resetclaimtimer\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: +1 deck slot\n`;
                }
                // KATRINA
                upgradeInfo += `<:katrina:1349263648144625694> **Katrina ${constants.ROMAN_NUMERALS[profileData.katTier]}** · `;
                if (profileData.katTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.katTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: +1% foil chance\n`;
                }
                // NOOK
                upgradeInfo += `<:tom_nook:1349263649356779562> **Nook ${constants.ROMAN_NUMERALS[profileData.nookTier]}** · `;
                if (profileData.nookTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else if (profileData.nookTier == 0) upgradeInfo += `Cost: **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853> · Reward: /daily\n`;
                else {
                    upgradeInfo += `Cost: **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853> · Reward: empower /daily, `;
                    if (profileData.nookTier == 1) upgradeInfo += `gain bells when claiming your wish\n`;
                    if (profileData.nookTier == 2) upgradeInfo += `gain bells on claim as well as sale\n`;
                    if (profileData.nookTier == 3) upgradeInfo += `cards sell for 50% more\n`;
                    if (profileData.nookTier == 4) upgradeInfo += `reduce all upgrade costs by 25%\n`;
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

function getUpgradeCost(upgradeTier, nookTier) {
    if (nookTier == constants.UPGRADE_COSTS.length - 1) return Math.round(constants.UPGRADE_COSTS[upgradeTier] * .75)
    return constants.UPGRADE_COSTS[upgradeTier];
}