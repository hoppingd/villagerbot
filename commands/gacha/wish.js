const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const villagers = require('../../villagerdata/data.json');
const { getOrCreateProfile } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wish')
        .setDescription("Wish for a card, or view your current wish.")
        .addStringOption(option =>
            option.setName('card')
                .setDescription('The card you want to wish for.')
        ),
    async execute(interaction) {
        try {
            let profileData = await getOrCreateProfile(interaction.user.id, interaction.guild.id);
            const cardName = interaction.options.getString('card');
            // if there was no argument supplied, display the user's currently wished card
            if (!cardName) {
                if (!profileData.wish) await interaction.reply(`<:celeste:1349263647121346662>: *"You're not wishing for anything right now, ${interaction.user}! Try wishing for a card with* ***/wish [card]**!"*`);
                else await interaction.reply(`<:celeste:1349263647121346662>: *"You are currently wishing for* ***${profileData.wish}**!"*`);
            }
            else {
                const normalizedCardName = cardName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, ""); //TODO simplify
                const villager = villagers.find(v => v.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[.']/g, "") === normalizedCardName || v.name_sort.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(".", "") === normalizedCardName);
                if (villager) {
                    profileData.wish = villager.name;
                    await profileData.save();
                    await interaction.reply(`<:celeste:1349263647121346662>: *"You are now wishing for* ***${villager.name}**!"*`);
                }
                else {
                    await interaction.reply({
                        content: `<:celeste:1349263647121346662>: *"I couldn't find a card named* ***${cardName}**. Are you sure you spelled it correctly?"*`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }
        } catch (err) {
            console.log(err);
            await interaction.reply(`There was an error attempting **/wish**.`);
        }
    },
};