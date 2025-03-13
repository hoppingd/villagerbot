const { Events } = require('discord.js');
const profileModel = require('../../models/profileSchema');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        let profile = await profileModel.create({
            userID: member.id,
            serverID: member.guild.id,
        });
        profile.save();
    },
};