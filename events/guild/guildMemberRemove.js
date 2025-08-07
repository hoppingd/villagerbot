const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            let profileData = await profileModel.findOne({userID: member.id, serverID: member.guild.id});
            if (!profileData) return; // the user never had profileData
            if (profileData.cards) {
                for (let card of profileData.cards) {
                    // track the loss of the card in the db
                    let charData = await charModel.findOne({ name: card.name });
                    charData.numClaims -= 1;
                    await charData.save();
                }
            }
            await profileModel.findOneAndDelete({userID: member.id, serverID: member.guild.id});
        } catch (err) {
            console.log("There was an error in GuildMemberRemove.");
            console.log(err);
        }
    },
};