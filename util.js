const profileModel = require('./models/profileSchema');
const charModel = require('./models/charSchema');
const constants = require('./constants');
const ntp = require('ntp-client');

// function to calculate bell value of a card
async function calculatePoints(charClaims, rarity) {
    let points = constants.MIN_POINTS;
    if (charClaims != 0) {
        let totalClaims;
        try {
            const result = await charModel.aggregate([
                { $group: { _id: null, totalClaims: { $sum: "$numClaims" } } }
            ]);

            totalClaims = result[0] ? result[0].totalClaims : 0;
        } catch (err) {
            console.error("Error summing numClaims:", err);
            return points;
        }
        // formula to calculate points
        let claimPercentage = charClaims / totalClaims; // alternatively, could divide by the number of unique decks
        points = Math.floor(constants.BASE * Math.exp(constants.SCALING_FACTOR * claimPercentage));
        points = Math.max(points, constants.MIN_POINTS);
        points = Math.min(points, constants.MAX_POINTS);
        points *= constants.RARITY_VALUE_MULTIPLIER[rarity];
    }

    return points;
}

// Utility function to fetch or create profile data
async function getOrCreateProfile(userID, serverID) {
    let profileData = await profileModel.findOne({ userID, serverID });
    if (!profileData) {
        profileData = await profileModel.create({
            userID,
            serverID,
        });
        await profileData.save();
    }
    return profileData;
}

function getOwnershipFooter(usernames) {
    const numUsers = usernames.length;
    if (numUsers == 0) return "";
    else if (numUsers == 1) return `Owned by ${usernames[0]}`;
    else if (numUsers == 2) return `Owned by ${usernames[0]} and ${usernames[1]}`;
    else if (numUsers == 3) return `Owned by ${usernames[0]}, ${usernames[1]}, and ${usernames[2]}`;
    else return `Owned by ${usernames[0]}, ${usernames[1]}, and ${remainingCount = numUsers - 2} more...`;
}

// function to get the rank of a card
async function getRank(cardName) {
    const result = await charModel.aggregate([
        { $sort: { numClaims: -1 } }, // Sort characters by numClaims in descending order
        { $project: { name: 1, numClaims: 1 } },
    ]);

    let rank = -1;

    result.forEach((char, index) => {
        if (char.name.toLowerCase() === cardName.toLowerCase()) {
            rank = index + 1;
        }
    });
    return rank;
}

function getTimeString(timeRemaining) {
    let hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60)); // get hours
    let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)); // get minutes
    let timeString = "";
    if (minutesRemaining == 60) {
        hoursRemaining += 1;
        minutesRemaining = 0;
    }
    if (hoursRemaining > 0) {
        if (hoursRemaining == 1) timeString += `**${hoursRemaining} hour** and `;
        else timeString += `**${hoursRemaining} hours** and `;
    }
    if (minutesRemaining == 1) timeString += `**${minutesRemaining} minute**`;
    else timeString += `**${minutesRemaining} minutes**`;
    return timeString;
}

function isYesOrNo(content) {
    return m.content == 'y' || m.content == 'n' || m.content == 'Y' || m.content == 'N';
}

module.exports = {
    calculatePoints,
    getOrCreateProfile,
    getOwnershipFooter,
    getRank,
    getTimeString,
    isYesOrNo,
};