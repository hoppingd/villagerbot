const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: false },
    serverID: { type: String, required: true, unique: false },
    bells: { type: Number, default: 0, min: [0, 'Negative bells are not allowed.'], max: [Number.MAX_VALUE, 'Max level reached.'] },
    wish: { type: String, default: null },
    deckName: { type: String, default: null },
    deckColor: { type: String, default: null },
    cards: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: Number, default: 0 },
            level: { type: Number, default: 1, max: [Number.MAX_VALUE, 'Max level reached.'] }
        }],
    },
    storage: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: Number, default: 0 },
            level: { type: Number, default: 1, max: [Number.MAX_VALUE, 'Max level reached.'] }
        }],
    },
    nookTier: { type: Number, default: 0 },
    brewTier: { type: Number, default: 0 },
    katTier: { type: Number, default: 0 },
    isaTier: { type: Number, default: 0 },
    celTier: { type: Number, default: 0 },
    blaTier: { type: Number, default: 0 },
    tortTier: { type: Number, default: 0 },
    energy: { type: Number, default: 5, min: [0, 'Negative energy is not allowed.'] },
    rechargeTimestamp: { type: Date, default: new Date(0) },
    claimTimestamp: { type: Date, default: new Date(0) },
    dailyBellsTimestamp: { type: Date, default: new Date(0) },
    resetClaimTimestamp: { type: Date, default: new Date(0) },
    rechargeCommandTimestamp: { type: Date, default: new Date(0) },
    lastSuccessfulVote: { type: Date, default: new Date(0) },
});

profileSchema.index({ userID: 1, serverID: 1 }, { unique: true });

const model = mongoose.model('ProfileModels', profileSchema);

module.exports = model;