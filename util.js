const profileModel = require('./models/profileSchema');
const charModel = require('./models/charSchema');
const constants = require('./constants');

// function to calculate bell value of a card
async function calculatePoints(charClaims, isFoil) {
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
        let claimPercentage = charClaims / totalClaims;
        points = Math.floor(constants.BASE * Math.exp(constants.SCALING_FACTOR * claimPercentage));
        points = Math.max(points, constants.MIN_POINTS);
        points = Math.min(points, constants.MAX_POINTS);
        if (isFoil) points *= constants.FOIL_VALUE_MULTIPLIER;
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

module.exports = {
    calculatePoints,
    getOrCreateProfile,
    getRank
};