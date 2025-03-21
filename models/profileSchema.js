const { time } = require('discord.js');
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: false },
    serverID: { type: String, require: true, unique: false },
    bells: { type: Number, default: 0, min: [0, 'Negative bells are not allowed.'] },
    wish: { type: String, default: null },
    deckName: { type: String, default: null },
    deckColor: { type: String, default: "green" },
    cards: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: String, default: null },
            level: { type: Number, default: 1 }
        }],
    },
    storage: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: Number, default: 0 },
            level: { type: Number, default: 1 }
        }],
    },
    nookTier: { type: Number, default: 0 },
    brewTier: { type: Number, default: 0 },
    katTier: { type: Number, default: 0 },
    isaTier: { type: Number, default: 0 },
    celTier: { type: Number, default: 0 },
    blaTier: { type: Number, default: 0 },
    energy: { type: Number, default: 5, min: [0, 'Negative energy is not allowed.'] },
    rechargeTimestamp: { type: Date, default: new Date(0) },
    claimTimestamp: { type: Date, default: new Date(0) },
    dailyBellsTimestamp: { type: Date, default: new Date(0) },
    resetClaimTimestamp: { type: Date, default: new Date(0) }
});

profileSchema.index({ userID: 1, serverID: 1 }, { unique: true });

const model = mongoose.model('ProfileModels', profileSchema);

module.exports = model;