const profileModel = require('./models/profileSchema');
const charModel = require('./models/charSchema');
const serverDataModel = require('./models/serverDataSchema');
const shopModel = require('./models/shopSchema');
const constants = require('./constants');

// calculates the bell value of a card
async function calculatePoints(charClaims, rarity) {
    let points = constants.MIN_POINTS;
    if (charClaims > 1) {
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
    }
    points *= constants.RARITY_VALUE_MULTIPLIER[rarity];
    return points;
}

function escapeMarkdown(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\~')
        .replace(/\|/g, '\\|')
        .replace(/>/g, '\\>')
        .replace(/`/g, '\\`');
}

async function fetchGuildName(client, guildID) {
    try {
        const guild = await client.guilds.fetch(guildID);
        return guild?.name ?? "Unknown Server";
    } catch {
        return "Unknown Server";
    }
}

async function fetchUsername(client, userID) {
    try {
        const user = await client.users.fetch(userID);
        return user.displayName;
    } catch {
        return "Unknown User";
    }
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

// gets the claim rank of a card
async function getClaimRank(cardName) {
    const result = await charModel.aggregate([
        { $sort: { numClaims: -1, name: 1 } }, // sort characters by numClaims in descending order, then by name
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

// returns the owner's rank given the level of their card
async function getLevelRank(cardName, ownedLevel) {
    // count how many users have that card at a HIGHER level
    const higherCount = await profileModel.aggregate([
        { $match: { isPrivate: false } }, // exclude private profiles
        { $unwind: "$cards" },
        { $match: { "cards.name": cardName } },
        { $match: { "cards.level": { $gt: ownedLevel } } },
        { $count: "count" }
    ]);

    const count = higherCount.length > 0 ? higherCount[0].count : 0;

    // Ranking is number of higher-level owners + 1
    return count + 1;
}

// returns a string displaying the level rank with the appropriate flair
function getLevelRankEmoji(levelRank) {
    if (levelRank === 1) {
        return constants.PRISMATIC_LEAF_CODE;
    }
    else if (levelRank <= 3) {
        return constants.GOLD_LEAF_CODE;
    }
    else if (levelRank <= 10) {
        return constants.SILVER_LEAF_CODE;
    }
    else if (levelRank <= 100) {
        return constants.BRONZE_LEAF_CODE;
    }
    else return "";
}

// fetches or creates profile data
async function getOrCreateProfile(userID, serverID) {
    const profiles = await profileModel.find({ userID });
    // check for cross-server profile
    let profileData = profiles.find(p => p.crossServer == true);
    if (profileData) return profileData;
    // check for per-server profile
    profileData = profiles.find(p => p.serverID === serverID);
    if (profileData) return profileData;
    // no profile found, create a new one
    try {
        profileData = await profileModel.create({
            userID,
            serverID,
        });
        await profileData.save();
        getOrCreateServerData(serverID);
    } catch (err) {
        console.log("There was an error in getOrCreateProfile.");
        console.log(err);
    }
    return profileData;
}

// fetches or creates server data
async function getOrCreateServerData(serverID) {
    let serverData = await serverDataModel.findOne({ serverID: serverID });
    if (!serverData) {
        try {
            serverData = await serverDataModel.create({
                serverID: serverID
            });
            await serverData.save();
        }
        catch (err) {
            console.log("There was an error in getOrCreateServerData.");
            console.log(err);
        }
    }
    return serverData;
}

// fetches or creates shop data
async function getOrCreateShop(serverID) {
    let shopData = await shopModel.findOne({ serverID: serverID });
    if (!shopData) {
        try {
            shopData = await shopModel.create({
                serverID: serverID
            });
            await shopData.save();
            getOrCreateServerData(serverID);
        }
        catch (err) {
            console.log("There was an error in getOrCreateShopData.");
            console.log(err);
        }
    }
    return shopData;
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

// returns the current date rounded to the nearest recharge interval
function getRechargeDate() {
    let rechargeDate = new Date(Date.now());
    rechargeDate.setMinutes(0);
    rechargeDate.setSeconds(0);
    rechargeDate.setMilliseconds(0);
    return rechargeDate;
}

function getTimeString(timeRemaining) {
    if (!Number.isFinite(timeRemaining) || timeRemaining <= 0) {
        return "**0 minutes**";
    }

    // total minutes, rounding up any leftover seconds
    let totalMinutes = Math.ceil(timeRemaining / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let timeString = "";

    if (hours > 0) {
        timeString += hours === 1 ? `**1 hour**` : `**${hours} hours**`;
        timeString += " and ";
    }

    timeString += minutes === 1 ? `**1 minute**` : `**${minutes} minutes**`;

    return timeString;
}

module.exports = {
    calculatePoints,
    escapeMarkdown,
    fetchGuildName,
    fetchUsername,
    getClaimDate,
    getClaimRank,
    getLevelRank,
    getLevelRankEmoji,
    getOrCreateProfile,
    getOrCreateServerData,
    getOrCreateShop,
    getOwnershipFooter,
    getRechargeDate,
    getTimeString
};