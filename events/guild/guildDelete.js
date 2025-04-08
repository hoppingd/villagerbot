const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const shopModel = require('../../models/shopSchema');

module.exports = {
    name: Events.GuildDelete,
    async execute(guild) {
        console.log(`Heard ${guild.name} get deleted, or I was removed from it.`)
        const profiles = await profileModel.find({ serverID: guild.id });
        for (let profile of profiles) {
            for (let card of profile.cards) {
                let charData = await charModel.findOne({ name: card.name });
                charData.numClaims -= 1;
                await charData.save();
            }
        }
        await profileModel.deleteMany({ serverID: guild.id });
        await shopModel.deleteOne({ serverID: guild.id });
    },
};