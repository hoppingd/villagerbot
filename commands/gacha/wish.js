const { InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const villagers = require('../../villagerdata/data.json');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wish')
        .setDescription("Wish commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current wish.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Wish for a card.')
                .addStringOption(option =>
                    option.setName('card')
                        .setDescription('The card you want to wish for.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clears your current wish.'))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        try {
            const profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const subCommand = interaction.options.getSubcommand();

            // VIEW SUBCOMMAND
            if (subCommand == 'view') {
                let wishName = profileData.wish;
                if (!wishName) await interaction.reply(`<:celeste:1349263647121346662>: *"You don't appear to be wishing for anything right now, ${interaction.user}! Try wishing for a card with* ***/wish set**!"*`);
                else if (wishName == "Blathers") await interaction.reply(`<:celeste:1349263647121346662>: *"Ah, it appears your wishing for my brother, **Blathers** <:blathers:1349263646206857236> !"*`);
                else if (wishName == "Celeste") await interaction.reply(`<:celeste:1349263647121346662>: *"Wh-what's this? You're wishing for me, **Celeste**?! I'm flattered..."*`);
                else await interaction.reply(`<:celeste:1349263647121346662>: *"You are currently wishing for* ***${wishName}**!"*`);
            }
            // SET SUBCOMMAND
            else if (subCommand == 'set') {
                const cardName = interaction.options.getString('card');
                const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, ""); //TODO simplify
                const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(".", "") === normalizedCardName);
                if (villager) {
                    profileData.wish = villager.name;
                    await profileData.save();
                    if (villager.name == "Blathers") await interaction.reply(`<:celeste:1349263647121346662>: *"You are now wishing for my dear brother, **Blathers** <:blathers:1349263646206857236> !"*`);
                    else if (villager.name == "Celeste") await interaction.reply(`<:celeste:1349263647121346662>: *"Hootie—TOOT! You're teasing me, aren't you? Very well, you are now wishing for **Celeste**..."*`);
                    else await interaction.reply(`<:celeste:1349263647121346662>: *"You are now wishing for* ***${villager.name}**!"*`);
                }
                else {
                    await interaction.reply(`<:celeste:1349263647121346662>: *"${interaction.user}, I couldn't find a card named* ***${cardName}**. Are you certain you spelled it correctly?"*`);
                }
            }
            // CLEAR SUBCOMMAND
            else {
                // if necessary, set wish to null
                if (profileData.wish != null) {
                    profileData.wish = null;
                    await profileData.save();
                }
                await interaction.reply({
                    content: `<:celeste:1349263647121346662>: *"You are no longer wishing for any card!"*`,
                })
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error attempting **/wish**: ${err.name}.`);
        }
    },
};