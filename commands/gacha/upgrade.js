const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const { getOrCreateProfile } = require('../../util');
const upgradeList =
                `<:blathers:1349263646206857236> **Blathers Upgrades**
                **Tier I:** +1 storage slot
                **Tier II:** cards sold from storage generate 50% more Bells
                **Tier III:** cards claimed into storage gain 8 levels
                **Tier IV:** +1 storage slot
                **Tier V:** cards claimed into storage have a ${constants.BLATHERS_BONUS_CHANCE}% chance to upgrade rarity (if possible)

                <:brewster:1349263645380710431> **Brewster Upgrades**
                **Tier I-IV:** +1 max energy  
                **Tier V:** +1 max energy, /recharge

                <:celeste:1349263647121346662> **Celeste Upgrades**
                **Tier I-V:** x2 wish chance

                <:isabelle:1349263650191315034> **Isabelle Upgrades**
                **Tier I-IV:** +1 deck slot  
                **Tier V:** /resetclaimtimer

                <:katrina:1349263648144625694> **Katrina Upgrades**
                **Tier I-V:** +1% foil chance

                <:tom_nook:1349263649356779562> **Nook Upgrades**
                **Tier I:** /daily
                **Tier II:** empower /daily, gain Bells when claiming or collecting rent on wish
                **Tier III:** empower /daily, gain Bells on claim as well as sale
                **Tier IV:** empower /daily, cards sell for 50% more
                **Tier V:** empower /daily, reduce all upgrade costs by 25%
                `;
                
module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Upgrade commands.')
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
                            { name: "Tortimer", value: "tort" },
                        )
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all possible upgrades.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current upgrades.'))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const subCommand = interaction.options.getSubcommand();
            const wasMaxed = isMaxed(profileData);
            // BUY SUBCOMMAND
            if (subCommand == 'buy') {
                const upgradeFlag = interaction.options.getString('type');
                // build buttons
                const yes = new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success);
                const no = new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder()
                    .addComponents(yes, no);
                switch (upgradeFlag) {
                    // BLATHERS UPGRADES
                    case "bla":
                        if (profileData.blaTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:blathers:1349263646206857236>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.blaTier, profileData.nookTier)) await interaction.reply(`<:blathers:1349263646206857236>: *"Hm... upon close persual, I see you require more bells for this upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.blaTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // build reply
                            const messageContent = `Purchase <:blathers:1349263646206857236> **Blathers ${constants.ROMAN_NUMERALS[profileData.blaTier]}** for **${getUpgradeCost(profileData.blaTier, profileData.nookTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getUpgradeCost(profileData.blaTier, profileData.nookTier);
                                    profileData.blaTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    if (profileData.blaTier == 1) try { await interaction.followUp(`<:blathers:1349263646206857236>: *"Oh hoo hoo... are those cards I see, ${interaction.user}? If your deck is full, I can hold onto new cards for you. Use* ***/storage move*** *to transfer them to your deck."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                    else try { await interaction.followUp(`<:blathers:1349263646206857236>: *"Hoo hoo... thank you for the donation, ${interaction.user}! Rest assured all upgrades will be in effect immediately!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // BREWSTER UPGRADES
                    case "brew":
                        if (profileData.brewTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:brewster:1349263645380710431>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.brewTier, profileData.nookTier)) await interaction.reply(`<:brewster:1349263645380710431>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // build reply
                            const messageContent = `Purchase <:brewster:1349263645380710431> **Brewster ${constants.ROMAN_NUMERALS[profileData.brewTier]}** for **${getUpgradeCost(profileData.brewTier, profileData.nookTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getUpgradeCost(profileData.brewTier, profileData.nookTier);
                                    profileData.brewTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    try { await interaction.followUp(`<:brewster:1349263645380710431>: *"This upgrade may seem a tad expensive at... ${getUpgradeCost(profileData.brewTier - 1, profileData.nookTier)} Bells, but it's well worth it. Here you go, ${interaction.user}. You now have more energy for your rolls."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                    if (profileData.brewTier == constants.UPGRADE_COSTS.length) try { await interaction.channel.send(`<:brewster:1349263645380710431>: *"Thanks for buying all of my upgrades, ${interaction.user}. Feel free to stop by the Roost with **/recharge**. I'll serve you a fresh brew that resets your rolls once per day."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm 'y' or 'n' in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // CELESTE UPGRADES
                    case "cel":
                        if (profileData.celTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:celeste:1349263647121346662>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.celTier, profileData.nookTier)) await interaction.reply(`<:celeste:1349263647121346662>: *"My sincerest apologies. You don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.celTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // build reply
                            const messageContent = `Purchase <:celeste:1349263647121346662> **Celeste ${constants.ROMAN_NUMERALS[profileData.celTier]}** for **${getUpgradeCost(profileData.celTier, profileData.nookTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getUpgradeCost(profileData.celTier, profileData.nookTier);
                                    profileData.celTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    try { await interaction.followUp(`<:celeste:1349263647121346662>: *"Upgrade purchased! Your wishes are now more powerful, ${interaction.user}!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // ISABELLE UPGRADES
                    case "isa":
                        if (profileData.isaTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:isabelle:1349263650191315034>: *"You already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.isaTier, profileData.nookTier)) await interaction.reply(`<:isabelle:1349263650191315034>: *"Sorry, you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // buildReply
                            const messageContent = `Purchase <:isabelle:1349263650191315034> **Isabelle ${constants.ROMAN_NUMERALS[profileData.isaTier]}** for **${getUpgradeCost(profileData.isaTier, profileData.nookTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getUpgradeCost(profileData.isaTier, profileData.nookTier);
                                    profileData.isaTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    if (profileData.isaTier < constants.UPGRADE_COSTS.length) try { await interaction.followUp(`<:isabelle:1349263650191315034>: *"Upgrade purchased! I fixed you up with a new deck slot, ${interaction.user}!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                    else try { await interaction.followUp(`<:isabelle:1349263650191315034>: *"Upgrade purchased! ${interaction.user}, you can now use* ***/resetclaimtimer**! I can refresh your ability to claim cards, but only once per day."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // KATRINA UPGRADES
                    case "kat":
                        if (profileData.katTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:katrina:1349263648144625694> *"Hm... you've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getUpgradeCost(profileData.katTier, profileData.nookTier)) await interaction.reply(`<:katrina:1349263648144625694>: *"Hmm... it appears you don't have enough Bells for that upgrade, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getUpgradeCost(profileData.katTier, profileData.nookTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // build reply
                            const messageContent = `Purchase <:katrina:1349263648144625694> **Katrina ${constants.ROMAN_NUMERALS[profileData.katTier]}** for **${getUpgradeCost(profileData.katTier, profileData.nookTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getUpgradeCost(profileData.katTier, profileData.nookTier);
                                    profileData.katTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    try { await interaction.followUp(`<:katrina:1349263648144625694>: *"Keeeeeeeeeee hamo-ata... Keeee haaaaaamo-atata... There are higher rarity cards in your future, ${interaction.user}..."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // NOOK UPGRADES
                    case "nook":
                        if (profileData.nookTier == constants.UPGRADE_COSTS.length) await interaction.reply(`<:tom_nook:1349263649356779562>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < constants.UPGRADE_COSTS[profileData.nookTier]) await interaction.reply(`<:tom_nook:1349263649356779562>: *"You need more Bells, yes? Come back when you have more, ${interaction.user}."*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853>)`);
                        else {
                            // build reply
                            const messageContent = `Purchase <:tom_nook:1349263649356779562> **Nook ${constants.ROMAN_NUMERALS[profileData.nookTier]}** for **${constants.UPGRADE_COSTS[profileData.nookTier]}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= constants.UPGRADE_COSTS[profileData.nookTier];
                                    profileData.nookTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    if (profileData.nookTier == 1) try { await interaction.followUp(`<:tom_nook:1349263649356779562>: *"The Bank of Nook is now open, ${interaction.user}! Yes, yes, the* ***/daily*** *command... use it to recieve a gift of Bells from yours truly! How generous of me, hm?"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                    else try { await interaction.followUp(`<:tom_nook:1349263649356779562>: *"Thank you for your purchase, ${interaction.user}! Enjoy the upgrade, yes?"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                if (isMaxed(profileData) && !wasMaxed) try { await interaction.channel.send(`<:tortimer:1354073717776453733>: *"Heh heh horf... you thought that was all, ${interaction.user}? You have much to learn, young sprout..."*`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            });
                        }
                        break;
                    // TORTIMER UPGRADES
                    case "tort":
                        if (!isMaxed(profileData)) await interaction.reply(`<:tortimer:1354073717776453733>: *"..."*`);
                        else if (profileData.tortTier == constants.MAX_TORT_LVL) await interaction.reply(`<:tortimer:1354073717776453733>: *"You've already purchased all of my upgrades, ${interaction.user}!"*`);
                        else if (profileData.bells < getTortCost(profileData.tortTier)) await interaction.reply(`<:tortimer:1354073717776453733>: *"Fool! You need more Bells for that upgrade!"*\n(Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${getTortCost(profileData.tortTier)}** <:bells:1349182767958855853>)`);
                        else {
                            // buildReply
                            const messageContent = `Purchase <:tortimer:1354073717776453733> **Tortimer ${constants.TORT_NUMERALS[profileData.tortTier]}** for **${getTortCost(profileData.tortTier)}** <:bells:1349182767958855853> ?`;
                            const reply = await interaction.reply({
                                content: messageContent,
                                components: [row],
                                withResponse: true,
                            });
                            // listen with a collector
                            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                            interaction.client.confirmationState[interaction.user.id] = true;

                            collector.on('collect', async i => {
                                i.deferUpdate();
                                if (i.user.id != interaction.user.id) return;
                                if (i.customId == 'yes') {
                                    profileData.bells -= getTortCost(profileData.tortTier);
                                    profileData.tortTier += 1;
                                    try { await profileData.save(); } catch (err) { console.log(`There was error updating the user profile in /upgrade: ${err}`); collector.stop(); return; }
                                    try { await interaction.followUp(`<:tortimer:1354073717776453733>: *"Thanks for the Bells, ${interaction.user}! Heh heh HORF!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                else {
                                    try { await interaction.followUp(`${interaction.user}, the upgrade purchase has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                }
                                collector.stop();
                            });

                            collector.on('end', async (collected, reason) => {
                                yes.setDisabled(true);
                                no.setDisabled(true);
                                try {
                                    await interaction.editReply({
                                        content: messageContent,
                                        components: [row],
                                    });
                                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                                interaction.client.confirmationState[interaction.user.id] = false;
                                if (reason === 'time') {
                                    try { await interaction.followUp(`${interaction.user}, you didn't confirm in time. The upgrade purchase was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
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
            // LIST SUBCOMMAND
            else if (subCommand == "list") {
                const listEmbed = new EmbedBuilder()
                    .setDescription(upgradeList);
                await interaction.reply({ embeds: [listEmbed] });
            }
            // VIEW SUBCOMMAND
            else {
                let upgradeInfo = "Type **/upgrade buy**, then choose the character you want to purchase an upgrade from. Your current upgrade progress is shown below.\n\n";
                // BLATHERS
                upgradeInfo += `<:blathers:1349263646206857236> **Blathers ${constants.ROMAN_NUMERALS[profileData.blaTier]}** · `;
                if (profileData.blaTier == constants.UPGRADE_COSTS.length) upgradeInfo += `Max level reached!\n`;
                else {
                    upgradeInfo += `Cost: **${getUpgradeCost(profileData.blaTier, profileData.nookTier)}** <:bells:1349182767958855853> · Reward: `;
                    if (profileData.blaTier == 0) upgradeInfo += `+1 storage slot\n`;
                    if (profileData.blaTier == 1) upgradeInfo += `cards sold from storage generate 50% more Bells\n`;
                    if (profileData.blaTier == 2) upgradeInfo += `cards claimed into storage gain 8 levels\n`;
                    if (profileData.blaTier == 3) upgradeInfo += `+1 storage slot\n`;
                    if (profileData.blaTier == 4) upgradeInfo += `cards claimed into storage have a ${constants.BLATHERS_BONUS_CHANCE}% chance to upgrade rarity (if possible)\n`;
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
                    if (profileData.nookTier == 1) upgradeInfo += `gain bells when claiming or collecting rent on wish\n`;
                    if (profileData.nookTier == 2) upgradeInfo += `gain bells on claim as well as sale\n`;
                    if (profileData.nookTier == 3) upgradeInfo += `cards sell for 50% more\n`;
                    if (profileData.nookTier == 4) upgradeInfo += `reduce all upgrade costs by 25%\n`;
                }
                // TORTIMER
                if (isMaxed(profileData)) {
                    upgradeInfo += `<:tortimer:1354073717776453733> **Tortimer ${constants.TORT_NUMERALS[profileData.tortTier]}** · `;
                    upgradeInfo += `Cost: **${getTortCost(profileData.tortTier)}** <:bells:1349182767958855853> ·  `;
                    if (profileData.tortTier == constants.MAX_TORT_LVL) upgradeInfo += `Max level reached!\n`;
                    else if ((profileData.tortTier + 1) % 5 == 0) upgradeInfo += `Reward: +1% prismatic chance\n`;
                    else upgradeInfo += `Reward: +1% foil chance\n`;
                }
                const upgradeEmbed = new EmbedBuilder()
                    .setDescription(upgradeInfo);
                await interaction.reply({ embeds: [upgradeEmbed] });
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with **/upgrade**: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};

function getUpgradeCost(upgradeTier, nookTier) {
    if (nookTier == constants.UPGRADE_COSTS.length) return Math.round(constants.UPGRADE_COSTS[upgradeTier] * .75)
    return constants.UPGRADE_COSTS[upgradeTier];
}

function isMaxed(profileData) {
    return profileData.blaTier == constants.UPGRADE_COSTS.length && profileData.brewTier == constants.UPGRADE_COSTS.length &&
        profileData.celTier == constants.UPGRADE_COSTS.length && profileData.isaTier == constants.UPGRADE_COSTS.length &&
        profileData.katTier == constants.UPGRADE_COSTS.length && profileData.nookTier == constants.UPGRADE_COSTS.length;
}

function getTortCost(tortTier) {
    return 20000 + 2000 * tortTier;
}