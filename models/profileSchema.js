const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: false },
    serverID: { type: String, require: true, unique: false },
    bells: { type: Number, default: 0 , min: [0, 'Negative bells are not allowed.']},
    wish: { type: String, default: null },
    deckName: { type: String, default: null},
    deckColor: { type: String, default: "green" },
    cards: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: String, default: null }
        }],
    },
    storage: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: String, default: null }
        }],
    },
    nookTier: { type: Number, default: 0 },
    brewTier: { type: Number, default: 0 },
    katTier: { type: Number, default: 0 },
    isaTier: { type: Number, default: 0 },
    celTier: { type: Number, default: 0 },
    blaTier: { type: Number, default: 0 }
});

profileSchema.index({ userID: 1, serverID: 1 }, { unique: true });

const model = mongoose.model('ProfileModels', profileSchema);

module.exports = model;