const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const constants = require('../../constants');
const villagers = require('../../villagerdata/data.json');
const charModel = require('../../models/charSchema');
const { calculatePoints, getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('storage')
        .setDescription("Storage commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your storage.')
                .addStringOption(option =>
                    option.setName('info')
                        .setDescription('Show additional information (optional).')
                        .addChoices(
                            { name: "Bells", value: "b" },
                            { name: "Gender", value: "g" },
                            { name: "Level", value: "l" },
                            { name: "Personality", value: "p" },
                            { name: "Species", value: "s" }
                        )
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('move')
                .setDescription('Move a card from storage to your deck.')
                .addStringOption(option =>
                    option.setName('card')
                        .setDescription('The card to be moved.')
                        .setRequired(true)
                ))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            if (profileData.storage.length == 0) {
                await interaction.reply(`You have no cards in your storage. Purchase storage slots from Blathers <:blathers:1349263646206857236> using **/upgrade**.`);
            }
            else {
                // VIEW SUBCOMMAND (copied from deck)
                if (subCommand == "view") {
                    // get preliminary info
                    const flag = interaction.options.getString('info');
                    let storage = profileData.storage;
                    // display the deck
                    let replyMessage = "";
                    for (let i = 0; i < storage.length; i++) {
                        const cardName = storage[i].name;
                        replyMessage += `${cardName}`;
                        if (storage[i].rarity == constants.RARITY_NUMS.FOIL) replyMessage += " <:foil:1414625123536732240>";
                        else if (storage[i].rarity == constants.RARITY_NUMS.PRISMATIC) replyMessage += `<:prismatic:1359641457702604800> `;
                        if (flag) {
                            replyMessage += " - ";
                            // BELLS
                            if (flag == "b") {
                                const charData = await charModel.findOne({ name: cardName });
                                const points = await calculatePoints(charData.numClaims, storage[i].rarity);
                                replyMessage += `**${points}** <:bells:1349182767958855853>`;
                            }
                            // GENDER
                            else if (flag == "g") {
                                const villager = villagers.find(v => v.name == cardName);
                                let gender = villager.gender;
                                if (!gender) replyMessage += `:transgender_symbol:`; // edge case for Somebody
                                else replyMessage += `:${gender.toLowerCase()}_sign:`;
                            }
                            // LEVEL
                            else if (flag == "l") {
                                replyMessage += `**${storage[i].level}** <:love:1352200821072199732>`;
                            }
                            // PERSONALITY
                            else if (flag == "p") {
                                const villager = villagers.find(v => v.name == cardName);
                                let personality = villager.personality;
                                if (!personality) replyMessage += `*Special*`;
                                else replyMessage += `*${personality}*`;
                            }
                            // SPECIES
                            else if (flag == "s") {
                                const villager = villagers.find(v => v.name == cardName);
                                replyMessage += `*${villager.species}*`;
                            }
                        }
                        replyMessage += "\n";
                    }
                    // make the message look nice
                    const storageEmbed = new EmbedBuilder()
                        .setAuthor({
                            name: `${interaction.user.displayName}'s Storage`,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setDescription(replyMessage)
                        .setFooter({ text: `${constants.BLATIER_TO_STORAGE_LIMIT[profileData.blaTier] - storage.length} storage slots remaining.` });
                    await interaction.reply({
                        embeds: [storageEmbed]
                    });
                }
                // MOVE SUBCOMMAND
                else {
                    // check that there is space in the deck
                    if (profileData.cards.length >= constants.DEFAULT_CARD_LIMIT + Math.min(profileData.isaTier, constants.ADDITIONAL_CARD_SLOTS)) {
                        return await interaction.reply(`<:blathers:1349263646206857236>: *"Hoo... hoo? Your deck is full, ${interaction.user}! Consider freeing up some space with* ***/sell*** *to free up some space."*`);
                    }
                    // check that a valid card was supplied
                    const cardName = interaction.options.getString('card');
                    const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
                    const cardIdx = profileData.storage.findIndex(card => card.name.toLowerCase() === normalizedCardName);
                    // the card exists
                    if (cardIdx != -1) {
                        const realName = profileData.storage[cardIdx].name;
                        // build reply
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
                        const messageContent = `<:blathers:1349263646206857236>: *"Would you like to retrieve your* ***${realName}*** *from storage?"*`;
                        const reply = await interaction.reply({
                            content: messageContent,
                            components: [row],
                            withResponse: true,
                        });
                        // listen with a collector
                        const collector = reply.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: constants.CONFIRM_TIME_LIMIT });
                        interaction.client.confirmationState[interaction.user.id] = true;

                        collector.on('collect', async i => {
                            try { await i.deferUpdate(); } catch (err) { console.log(`There was an error with deferUpdate: ${err}`); return;}
                            if (i.user.id != interaction.user.id) return;
                            if (i.customId == 'yes') {
                                const card = profileData.storage[cardIdx];
                                profileData.cards.push({ name: card.name, rarity: card.rarity, level: card.level });
                                profileData.storage[cardIdx] = null;
                                profileData.storage = profileData.storage.filter(card => card !== null);
                                try { await profileData.save(); } catch (err) { console.log(`There was an error updating the user profile in /storage: ${err}`); collector.stop(); return;}
                                try { await interaction.followUp(`<:blathers:1349263646206857236>: *"Hoo hoo!* ***${realName}*** *has been transferred to your deck!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            }
                            else {
                                try { await interaction.followUp(`<:blathers:1349263646206857236>: *"Very well... I shall hold onto your* ***${realName}*** *for now."*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
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
                                try { await interaction.followUp(`<:blathers:1349263646206857236>: *"Hooooo... WHO?! ${interaction.user}, you didn't respond in time!"*`); } catch (APIError) { console.log("Could not send follow up message. The message may have been deleted."); }
                            }
                        });
                    }
                    else return await interaction.reply(`<:blathers:1349263646206857236>: *"Hoo... hoo? I don't see that card anywhere, ${interaction.user}... Are you quite certain you gave it to me? Try using* ***/storage view**."*`);

                }
            }

        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error with /storage: ${err.name}. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};