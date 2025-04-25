const profileModel = require('./models/profileSchema');
const charModel = require('./models/charSchema');
const constants = require('./constants');

// calculates the bell value of a card
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

// returns the current date rounded to the nearest past claim interval
function getClaimDate() {
    let claimDate = new Date(Date.now());
    let claimHour = Math.floor(claimDate.getHours() / 4) * 4;
    claimDate.setHours(claimHour);
    claimDate.setMinutes(0);
    claimDate.setSeconds(0);
    claimDate.setMilliseconds(0);
    return claimDate;
}

// fetches or creates profile data
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

// constructs an ownership footer for card embeds based on a list of owners sorted by level
function getOwnershipFooter(usernames) {
    const numUsers = usernames.length;
    if (numUsers == 0) return "";
    else if (numUsers == 1) return `Owned by ${usernames[0]}`;
    else if (numUsers == 2) return `Owned by ${usernames[0]} and ${usernames[1]}`;
    else if (numUsers == 3) return `Owned by ${usernames[0]}, ${usernames[1]}, and ${usernames[2]}`;
    else return `Owned by ${usernames[0]}, ${usernames[1]}, and ${remainingCount = numUsers - 2} more...`;
}

// gets the rank of a card
async function getRank(cardName) {
    const result = await charModel.aggregate([
        { $sort: { numClaims: -1, name: 1 } }, // Sort characters by numClaims in descending order, then by name
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

// returns the current date rounded to the nearest recharge interval
function getRechargeDate() {
    let rechargeDate = new Date(Date.now());
    rechargeDate.setMinutes(0);
    rechargeDate.setSeconds(0);
    rechargeDate.setMilliseconds(0);
    return rechargeDate;
}

// converts milliseconds to an hours and minutes string
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

// validates wheter message content is y or n, case-insensitive
function isYesOrNo(content) {
    return content == 'y' || content == 'n' || content == 'Y' || content == 'N';
}

module.exports = {
    calculatePoints,
    getClaimDate,
    getOrCreateProfile,
    getOwnershipFooter,
    getRank,
    getRechargeDate,
    getTimeString,
    isYesOrNo,
};