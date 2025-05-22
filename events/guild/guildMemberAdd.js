const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            let profile = await profileModel.create({
                userID: member.id,
                serverID: member.guild.id,
            });
            profile.save();
        } catch (err) {
            console.log("There was an error in GuildMemberAdd.");
            console.log(err);
        }
    },
};