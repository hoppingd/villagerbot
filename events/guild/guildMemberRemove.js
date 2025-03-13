const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            console.log(`Heard ${member.displayName} leave.`)
            let profileData = await profileModel.findOne({userID: member.id, serverID: member.guild.id});
            for (let card of profileData.cards) {
                // track the loss of the card in the db
                let charData = await charModel.findOne({ name: card.name });
                charData.numClaims -= 1;
                await charData.save();
            }
            await profileModel.findOneAndDelete({userID: member.id, serverID: member.guild.id});
        } catch (err) {
            console.log(err);
        }
    },
};