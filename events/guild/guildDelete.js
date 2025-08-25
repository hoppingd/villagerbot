const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const shopModel = require('../../models/shopSchema');
const serverDataModel = require('../../models/serverDataSchema');

module.exports = {
    name: Events.GuildDelete,
    async execute(guild) {
        try {
            const profiles = await profileModel.find({ serverID: guild.id });
            if (profiles) {
                for (let profile of profiles) {
                    if (!profile.cards) break;
                    for (let card of profile.cards) {
                        let charData = await charModel.findOne({ name: card.name });
                        charData.numClaims -= 1;
                        await charData.save();
                    }
                }
                await profileModel.deleteMany({ serverID: guild.id });
            }
            await shopModel.deleteOne({ serverID: guild.id });
            await serverDataModel.deleteOne({ serverID: guild.id });
        } catch (err) {
            console.log("There was an error in GuildDelete.");
            console.log(err);
        }
    },
};