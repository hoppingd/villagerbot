const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');
const constants = require('../../constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription("Give commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('bells')
                .setDescription('Give a player some of your bells.')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The amount of bells to be gifted.')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(Number.MAX_SAFE_INTEGER)
                )
                .addUserOption(option =>
                    option.setName('recipient')
                        .setDescription('The recipient of the gift.')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('card')
                .setDescription('Give a player one of your cards.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the card to be gifted.')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('recipient')
                        .setDescription('The recipient of the gift.')
                        .setRequired(true)
                ))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const subCommand = interaction.options.getSubcommand();
            const recipient = interaction.options.getUser('recipient');
            if (recipient.bot) return await interaction.reply({ content: "You supplied a bot for the recipient argument. Please specify a real user.", flags: MessageFlags.Ephemeral });
            if (recipient.id == interaction.user.id) return await interaction.reply({ content: "You cannot gift to yourself.", flags: MessageFlags.Ephemeral });
            if (interaction.client.confirmationState[recipient.id]) return await interaction.reply({ content: "You cannot gift someone who is awaiting confirmation on a key command. Please try again later.", flags: MessageFlags.Ephemeral });
            if (interaction.client.recipientState[recipient.id]) return await interaction.reply({ content: "That user is already being traded with or gifted to. Please try again later.", flags: MessageFlags.Ephemeral });
            // BELLS SUBCOMMAND
            if (subCommand == "bells") {
                const amount = interaction.options.getInteger('amount');
                // check valid input for BELLS
                if (profileData.bells < amount) return await interaction.reply(`You don't have enough Bells for that, ${interaction.user}. (Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${amount}** <:bells:1349182767958855853>)`);
                // build reply
                const yes = new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success);
                const no = new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger);
                const cancel = new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);
                const row = new ActionRowBuilder()
                    .addComponents(yes, no, cancel);
                const messageContent = `${recipient}, ${interaction.user} wants to give you **${amount}** <:bells:1349182767958855853>. Do you accept?`;
                const reply = await interaction.reply({
                    content: messageContent,
                    components: [row],
                    withResponse: true,
                });
                // listen with a collector
                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT  });
                interaction.client.confirmationState[interaction.user.id] = true;
                interaction.client.recipientState[recipient.id] = true;

                collector.on('collect', async i => {
                    i.deferUpdate();
                    // the recipient responded
                    if (i.user.id == recipient.id) {
                        if (i.customId == 'yes') {
                            // check if the recipient is in the middle of a key operation
                            if (interaction.client.confirmationState[recipient.id]) {
                                try { return await interaction.channel.send(`${recipient}, you cannot accept a gift while awaiting confirmation on another key operation.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                            // check if the recipient is using commands too quickly
                            const now = Date.now();
                            if (interaction.client.cooldowns[recipient.id]) {
                                const expirationTime = interaction.client.cooldowns[recipient.id] + constants.GLOBAL_COMMAND_COOLDOWN;
                                if (now < expirationTime) {
                                    try { return await interaction.channel.send(`${recipient}, you are using commands too quickly. Please slow down.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                                }
                            }
                            interaction.client.cooldowns[interaction.user.id] = now;
                            setTimeout(() => interaction.client.cooldowns.delete(recipient.id), constants.GLOBAL_COMMAND_COOLDOWN);
                            const recipientData = await getOrCreateProfile(recipient.id, interaction.guild.id);
                            recipientData.bells += amount;
                            profileData.bells -= amount;
                            await profileData.save();
                            await recipientData.save();
                            try { await interaction.followUp(`Gift successful! ${interaction.user} gave **${amount}** <:bells:1349182767958855853> to ${recipient}!`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            collector.stop();
                        }
                        else if (i.customId == 'no') {
                            try { interaction.followUp(`The gift was refused.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            collector.stop();
                        }
                    }
                    // the gifter responded
                    else if (i.user.id == interaction.user.id && i.customId == 'cancel') {
                        try { interaction.followUp(`The gift was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        collector.stop();
                    }
                });

                collector.on('end', async (collected, reason) => {
                    yes.setDisabled(true);
                    no.setDisabled(true);
                    cancel.setDisabled(true);
                    try {
                        await interaction.editReply({
                            content: messageContent,
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                    interaction.client.confirmationState[interaction.user.id] = false;
                    interaction.client.recipientState[recipient.id] = false;
                    if (reason === 'time') {
                        try { await interaction.followUp(`${recipient} didn't respond in time. The gift was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                });
            }
            // CARD SUBCOMMAND
            else {
                const cardName = interaction.options.getString('name');
                const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
                const cardIdx = profileData.cards.findIndex(card => card.name.toLowerCase() === normalizedCardName);
                const storageIdx = profileData.storage.findIndex(card => card.name.toLowerCase() === normalizedCardName);
                let realName = null;
                let rarity = null;
                let level = null;
                // the card is not in the deck
                if (cardIdx == -1) {
                    // the card is in storage
                    if (storageIdx != -1) {
                        realName = profileData.storage[storageIdx].name;
                        rarity = profileData.storage[storageIdx].rarity;
                        level = profileData.storage[storageIdx].level;
                    }
                    else return await interaction.reply(`No card named **${cardName}** found in your deck or storage. Use **/deck** to view your deck, and **/storage view** to view your storage.`);
                }
                else {
                    realName = profileData.cards[cardIdx].name;
                    rarity = profileData.cards[cardIdx].rarity;
                    level = profileData.cards[cardIdx].level;
                }
                // build the reply
                const yes = new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success);
                const no = new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger);
                const cancel = new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);
                const row = new ActionRowBuilder()
                    .addComponents(yes, no, cancel);
                const messageContent = `${recipient}, ${interaction.user} wants to give you their **${realName}**. Do you accept?`;
                const reply = await interaction.reply({
                    content: messageContent,
                    components: [row],
                    withResponse: true,
                });
                // listen with a collector
                const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT  });
                interaction.client.confirmationState[interaction.user.id] = true;
                interaction.client.recipientState[recipient.id] = true;

                collector.on('collect', async i => {
                    i.deferUpdate();
                    // the recipient responded
                    if (i.user.id == recipient.id) {
                        if (i.customId == 'yes') {
                            // check if the recipient is in the middle of a key operation
                            if (interaction.client.confirmationState[recipient.id]) {
                                try { return await interaction.channel.send(`${recipient}, you cannot accept a gift while awaiting confirmation on another key operation.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                            // check if the recipient is using commands too quickly
                            const now = Date.now();
                            if (interaction.client.cooldowns[recipient.id]) {
                                const expirationTime = interaction.client.cooldowns[recipient.id] + constants.GLOBAL_COMMAND_COOLDOWN;
                                if (now < expirationTime) {
                                    try { return await interaction.channel.send(`${recipient}, you are using commands too quickly. Please slow down.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                                }
                            }
                            interaction.client.cooldowns[interaction.user.id] = now;
                            setTimeout(() => interaction.client.cooldowns.delete(recipient.id), constants.GLOBAL_COMMAND_COOLDOWN);
                            const recipientData = await getOrCreateProfile(recipient.id, interaction.guild.id);
                            // check if the recipient already owns the card
                            if (recipientData.cards.some(card => card.name === realName) || recipientData.storage.some(card => card === realName)) {
                                try { return await interaction.channel.send(`You already own **${realName}**, ${recipient}. In order to accept this gift, you must first get rid of your **${realName}**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                            // there is room for the card in deck
                            if (recipientData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(recipientData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                                recipientData.cards.push({ name: realName, rarity: rarity, level: level});
                                if (cardIdx != -1) {
                                    profileData.cards[cardIdx] = null;
                                    profileData.cards = profileData.cards.filter(card => card !== null);
                                }
                                else {
                                    profileData.storage[storageIdx] = null;
                                    profileData.storage = profileData.storage.filter(card => card !== null);
                                }
                                profileData.save();
                                recipientData.save();
                                try { await interaction.followUp(`Gift successful! ${interaction.user} gave their **${realName}** to ${recipient}!`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                collector.stop();
                            }
                            // there is room for the card in storage
                            else if (recipientData.storage.length < constants.BLATIER_TO_STORAGE_LIMIT[recipientData.blaTier]) {
                                recipientData.storage.push({ name: realName, rarity: rarity, level: level });
                                if (cardIdx != -1) {
                                    profileData.cards[cardIdx] = null;
                                    profileData.cards = profileData.cards.filter(card => card !== null);
                                }
                                else {
                                    profileData.storage[storageIdx] = null;
                                    profileData.storage = profileData.storage.filter(card => card !== null);
                                }
                                profileData.save();
                                recipientData.save();
                                try { await interaction.followUp(`Gift successful! ${interaction.user} gave their **${realName}** to ${recipient}! The card was put into storage.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                                collector.stop();
                            }
                            else {
                                return await interaction.channel.send(`Your deck is full, so you cannot accept **${realName}**, ${recipient}. In order to accept this gift, you must first free up space in your deck or storage.`);
                            }
                        }
                        else if (i.customId == 'no') {
                            try { interaction.followUp(`The gift was refused.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            collector.stop();
                        }
                    }
                    // the gifter responded
                    else if (i.user.id == interaction.user.id && i.customId == 'cancel') {
                        try { interaction.followUp(`The gift was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        collector.stop();
                    }
                });

                collector.on('end', async (collected, reason) => {
                    yes.setDisabled(true);
                    no.setDisabled(true);
                    cancel.setDisabled(true);
                    try {
                        await interaction.editReply({
                            content: messageContent,
                            components: [row],
                        });
                    } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                    interaction.client.confirmationState[interaction.user.id] = false;
                    interaction.client.recipientState[recipient.id] = false;
                    if (reason === 'time') {
                        try { await interaction.followUp(`${recipient} didn't respond in time. The gift was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    }
                });
            }
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with the gift: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};