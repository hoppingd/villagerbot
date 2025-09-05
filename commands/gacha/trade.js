const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../util');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription("Trade with another user.")
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The person you want to trade with.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('offeredcards')
                .setDescription('A list of the cards you want to offer.')
        )
        .addIntegerOption(option =>
            option.setName('offeredbells')
                .setDescription('The number of Bells you want to offer.')
                .setMinValue(1)
                .setMaxValue(Number.MAX_SAFE_INTEGER)
        )
        .addStringOption(option =>
            option.setName('requestedcards')
                .setDescription('A list of the cards you want to request.')
        )
        .addIntegerOption(option =>
            option.setName('requestedbells')
                .setDescription('The number of Bells you want to request.')
                .setMinValue(1)
                .setMaxValue(Number.MAX_SAFE_INTEGER)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const target = interaction.options.getUser('target');
            // check for valid target
            if (target.bot) return await interaction.reply({ content: "You supplied a bot for the target argument. Please specify a real user.", flags: MessageFlags.Ephemeral });
            if (target.id == interaction.user.id) return await interaction.reply({ content: "You cannot trade with yourself.", flags: MessageFlags.Ephemeral });
            if (interaction.client.confirmationState[target.id]) return await interaction.reply({ content: "You cannot trade with someone who is awaiting confirmation on a key command. Please try again later.", flags: MessageFlags.Ephemeral });
            if (interaction.client.recipientState[target.id]) return await interaction.reply({ content: "That user is already being traded with or gifted to. Please try again later.", flags: MessageFlags.Ephemeral });
            // get options
            const offerString = interaction.options.getString('offeredcards');
            const requestString = interaction.options.getString('requestedcards');
            const offeredBells = interaction.options.getInteger('offeredbells') ?? 0;
            const requestedBells = interaction.options.getInteger('requestedbells') ?? 0;
            // check there is an offer and a request
            if (!offerString && offeredBells == 0) return await interaction.reply({ content: "You must offer something to trade. For gifts, use **/give**.", flags: MessageFlags.Ephemeral });
            if (!requestString && requestedBells == 0) return await interaction.reply({ content: "You must request something from the target. For gifts, use **/give**.", flags: MessageFlags.Ephemeral });
            if (!offerString && !requestString) return await interaction.reply({ content: "In order to be a valid trade, at least one participant must be trading cards.", flags: MessageFlags.Ephemeral });
            if (offeredBells != 0 && requestedBells != 0) return await interaction.reply({ content: "Only one of the participants can trade Bells. Please try again.", flags: MessageFlags.Ephemeral });
            // normalize offeredCards and check that the cards exist
            const offeredCards = offerString?.split(',').map(item => item.trim()) || [];
            for (let i = 0; i < offeredCards.length; i++) {
                const cardName = offeredCards[i];
                const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
                const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName);
                if (!villager) return await interaction.reply(`Could not find a card named **${cardName}**. Please try again. (Use **/help** for information about trading syntax.)`);
                offeredCards[i] = villager.name;
            }
            // normalize requestCards and check that the cards exist
            const requestedCards = requestString?.split(',').map(item => item.trim()) || [];
            for (let i = 0; i < requestedCards.length; i++) {
                const cardName = requestedCards[i];
                const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
                const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName);
                if (!villager) return await interaction.reply(`Could not find a card named **${cardName}**. Please try again. (Use **/help** for information about trading syntax.)`);
                requestedCards[i] = villager.name;
            }
            // remove duplicates in both arrays
            const uniqueOfferedCards = [...new Set(offeredCards)];
            const uniqueRequestedCards = [...new Set(requestedCards)];
            while (offeredCards.length) offeredCards.pop();
            while (requestedCards.length) requestedCards.pop();
            offeredCards.push(...uniqueOfferedCards);
            requestedCards.push(...uniqueRequestedCards);
            // check that no requested cards already exist in the user's deck, or if they do, they are being offered
            for (let i = 0; i < requestedCards.length; i++) {
                const cardName = requestedCards[i];
                if (!offeredCards.includes(cardName)) {
                    const cardIdx = profileData.cards.findIndex(card => card.name == cardName);
                    const storageIdx = profileData.storage.findIndex(card => card.name == cardName);
                    if (cardIdx != -1 || storageIdx != -1) return await interaction.reply(`You cannot request ${cardName}, since you already own it and are not offering it in the trade.`);
                }
            }
            // check that the user has the offered cards and store their indices
            const offeredCardIndices = [];
            for (let i = 0; i < offeredCards.length; i++) {
                const cardName = offeredCards[i];
                const cardIdx = profileData.cards.findIndex(card => card.name == cardName);
                const storageIdx = profileData.storage.findIndex(card => card.name == cardName);
                if (cardIdx == -1 && storageIdx == -1) return await interaction.reply(`Could not find a card named **${cardName}** in your deck or storage. Please try again.`);
                offeredCardIndices.push({ cardIdx: cardIdx, storageIdx: storageIdx });
            }
            // check that there is room in the user's deck
            const userOpenDeckSlots = constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS) - profileData.cards.length + offeredCards.length;
            const userOpenStorageSlots = constants.BLATIER_TO_STORAGE_LIMIT[profileData.blaTier] - profileData.storage.length;
            if (requestedCards.length > userOpenDeckSlots + userOpenStorageSlots) return await interaction.reply(`You don't have enough room for the requested cards, ${interaction.user}. Try selling some cards with **/sell** or purchasing more slots with **/upgrade**.`);
            // check offeredBells
            if (offeredBells > profileData.bells) return await interaction.reply(`You don't have enough Bells for that, ${interaction.user}. (Current: **${profileData.bells}** <:bells:1349182767958855853>, Needed: **${offeredBells}** <:bells:1349182767958855853>)`);
            // create the user's part of the trade message
            let tradeMsg = `${target}, ${interaction.user} wants to trade you `;
            if (offeredCards.length == 1) {
                tradeMsg += `**${offeredCards[0]}**`;
            } else if (offeredCards.length == 2 && offeredBells == 0) {
                tradeMsg += `**${offeredCards[0]}** and **${offeredCards[1]}**`
            } else if (offeredCards.length.length > 2 && offeredBells == 0) {
                tradeMsg += offeredCards.map(card => `**${card}**`).slice(0, -1).join(', ') + ', and ' + `**${offeredCards[offeredCards.length - 1]}**`;
            } else if (offeredCards.length.length > 1) {
                tradeMsg += offeredCards.map(card => `**${card}**`).join(', ');
            }
            if (offeredBells > 0) {
                if (offeredCards.length == 0) tradeMsg += `**${offeredBells}** <:bells:1349182767958855853>`;
                else tradeMsg += ` and **${offeredBells}** <:bells:1349182767958855853>`;
            }
            tradeMsg += ` for `
            // create the target's part of the trade message
            if (requestedCards.length == 1) {
                tradeMsg += `**${requestedCards[0]}**`;
            } else if (requestedCards.length == 2 && requestedBells == 0) {
                tradeMsg += `**${requestedCards[0]}** and **${requestedCards[1]}**`
            } else if (requestedCards.length > 2 && offeredBells == 0) {
                tradeMsg += requestedCards.map(card => `**${card}**`).slice(0, -1).join(', ') + ', and ' + `**${requestedCards[requestedCards.length - 1]}**`;
            } else if (requestedCards.length > 1) {
                tradeMsg += requestedCards.map(card => `**${card}**`).join(', ');
            }
            if (requestedBells > 0) {
                if (requestedCards.length == 0) tradeMsg += `**${requestedBells}** <:bells:1349182767958855853>`;
                else tradeMsg += ` and **${requestedBells}** <:bells:1349182767958855853>`;
            }
            tradeMsg += `. Do you accept?`;
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
            const reply = await interaction.reply({
                content: tradeMsg,
                components: [row],
                withResponse: true,
            });
            // listen with a collector
            const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
            interaction.client.confirmationState[interaction.user.id] = true;
            interaction.client.recipientState[target.id] = true;

            collector.on('collect', async i => {
                try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return;}
                // the target responded
                if (i.user.id == target.id) {
                    if (i.customId == 'yes') {
                        // check if the target is in the middle of a key operation
                        if (interaction.client.confirmationState[target.id]) {
                            try { return await interaction.channel.send(`${target}, you cannot accept a trade while awaiting confirmation on another key operation.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        }
                        // check if the target is using commands too quickly
                        const now = Date.now();
                        if (interaction.client.cooldowns[target.id]) {
                            const expirationTime = interaction.client.cooldowns[target.id] + constants.GLOBAL_COMMAND_COOLDOWN;
                            if (now < expirationTime) {
                                try { return await interaction.channel.send(`${target}, you are using commands too quickly. Please slow down.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            }
                        }
                        interaction.client.cooldowns[interaction.user.id] = now;
                        setTimeout(() => interaction.client.cooldowns.delete(target.id), constants.GLOBAL_COMMAND_COOLDOWN);
                        const targetData = await getOrCreateProfile(target.id, interaction.guild.id);
                        // check that no offered cards already exist in the target's deck, or if they do, they are being requested
                        for (let i = 0; i < offeredCards.length; i++) {
                            const cardName = offeredCards[i];
                            if (!requestedCards.includes(cardName)) {
                                const cardIdx = targetData.cards.findIndex(card => card.name == cardName);
                                const storageIdx = targetData.storage.findIndex(card => card.name == cardName);
                                if (cardIdx != -1 || storageIdx != -1) try { return await interaction.channel.send(`${target}, you cannot accept ${cardName}, since you already own it and are not giving it in the trade. You can sell your copy with **/sell**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                        }
                        // check if that the target has the requested cards and store their indices
                        const requestedCardIndices = [];
                        for (let i = 0; i < requestedCards.length; i++) {
                            const cardName = requestedCards[i];
                            const cardIdx = targetData.cards.findIndex(card => card.name == cardName);
                            const storageIdx = targetData.storage.findIndex(card => card.name == cardName);
                            if (cardIdx == -1 && storageIdx == -1) {
                                collector.stop();
                                try { return await interaction.channel.send(`${target}, I could not find a card named **${cardName}** in your deck or storage. The trade has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                            }
                            requestedCardIndices.push({ cardIdx: cardIdx, storageIdx: storageIdx });
                        }
                        // check requestedBells
                        if (requestedBells > targetData.bells) {
                            collector.stop();
                            try { return await interaction.followUp(`You don't have enough Bells for that, ${target}. (Current: **${targetData.bells}** <:bells:1349182767958855853>, Needed: **${requestedBells}** <:bells:1349182767958855853>) The trade has been cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        }
                        // check that there is room in the target's deck
                        const targetOpenDeckSlots = constants.DEFAULT_CARD_LIMIT + Math.min(targetData.isaTier, constants.ADDITIONAL_CARD_SLOTS) - targetData.cards.length + requestedCards.length;
                        const targetOpenStorageSlots = constants.BLATIER_TO_STORAGE_LIMIT[targetData.blaTier] - targetData.storage.length;
                        if (offeredCards.length > targetOpenDeckSlots + targetOpenStorageSlots) try { return await interaction.channel.send(`You don't have enough room for the offered cards, ${target}. Try selling some cards with **/sell** or purchasing more slots with **/upgrade**.`); } catch (APIError) { console.log("Could not send follow up message. The channel may have been deleted."); }
                        // get offered cards from user's deck
                        const offeredCardData = [];
                        for (let i = 0; i < offeredCardIndices.length; i++) {
                            let cardIdx = offeredCardIndices[i].cardIdx;
                            let storageIdx = offeredCardIndices[i].storageIdx;
                            if (cardIdx != -1) {
                                offeredCardData.push(profileData.cards[cardIdx]);
                                profileData.cards[cardIdx] = null;
                            }
                            else {
                                card = profileData.storage[storageIdx];
                                profileData.storage[storageIdx] = null;
                            }
                        }
                        profileData.cards = profileData.cards.filter(card => card !== null);
                        profileData.storage = profileData.storage.filter(card => card !== null);
                        // get requested cards from target's deck
                        const requestedCardData = [];
                        for (let i = 0; i < requestedCardIndices.length; i++) {
                            let cardIdx = requestedCardIndices[i].cardIdx;
                            let storageIdx = requestedCardIndices[i].storageIdx;
                            if (cardIdx != -1) {
                                requestedCardData.push(targetData.cards[cardIdx]);
                                targetData.cards[cardIdx] = null;
                            }
                            else {
                                requestedCardData.push(targetData.storage[storageIdx]);
                                targetData.storage[storageIdx] = null;
                            }
                        }
                        targetData.cards = targetData.cards.filter(card => card !== null);
                        targetData.storage = targetData.storage.filter(card => card !== null);
                        // put offered cards in target's deck
                        for (let i = 0; i < offeredCardData.length; i++) {
                            if (targetData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(targetData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                                targetData.cards.push({ name: offeredCardData[i].name, rarity: offeredCardData[i].rarity, level: offeredCardData[i].level });
                            }
                            else targetData.storage.push({ name: offeredCardData[i].name, rarity: offeredCardData[i].rarity, level: offeredCardData[i].level });
                        }
                        // put requested cards in user's deck
                        for (let i = 0; i < requestedCardData.length; i++) {
                            if (profileData.cards.length < constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                                profileData.cards.push({ name: requestedCardData[i].name, rarity: requestedCardData[i].rarity, level: requestedCardData[i].level });
                            }
                            else profileData.storage.push({ name: requestedCardData[i].name, rarity: requestedCardData[i].rarity, level: requestedCardData[i].level });
                        }
                        // trade bells
                        profileData.bells -= offeredBells;
                        profileData.bells += requestedBells;
                        targetData.bells -= requestedBells;
                        targetData.bells += offeredBells;
                        // wrap up
                        try { await profileData.save(); } catch (err) { console.log(`There was an error updating the gifter's profile: ${err}`); collector.stop(); return; }
                        try { await targetData.save(); } catch (err) { console.log(`There was an error updating the target's profile: ${err}`); collector.stop(); return; }
                        try { interaction.followUp(`Trade successful!`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        collector.stop();
                    }
                    else if (i.customId == 'no') {
                        try { interaction.followUp(`The trade was refused.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                        collector.stop();
                    }
                }
                // the trade initiator responded
                else if (i.user.id == interaction.user.id && i.customId == 'cancel') {
                    try { interaction.followUp(`The trade was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                    collector.stop();
                }
            });

            collector.on('end', async (collected, reason) => {
                yes.setDisabled(true);
                no.setDisabled(true);
                cancel.setDisabled(true);
                try {
                    await interaction.editReply({
                        content: tradeMsg,
                        components: [row],
                    });
                } catch (APIError) { console.log("Could not edit reply. The message may have been deleted."); }
                interaction.client.confirmationState[interaction.user.id] = false;
                interaction.client.recipientState[target.id] = false;
                if (reason === 'time') {
                    try { await interaction.followUp(`${target}, you didn't choose Yes or No in time. The trade was cancelled.`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                }
            });
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with the trade: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};