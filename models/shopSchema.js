const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    serverID: { type: String, required: true, unique: true },
    merchandise: {
        type: [{
            id: { type: String, default: 0 }, // todo: make this required
            name: { type: String, default: null },
            rarity: { type: Number, default: 0 },
            purchasedBy: { type: String, default: null }
        }],
    },
    lastRefreshed: { type: Date, default: 0 },
    reddTier: { type: Number, default: 0 },
    donors: {
        type: [{
            userID: { type: String, default: null },
            amount: { type: Number, default: 0 },
        }],
    },
    totalDonations: { type: Number, default: 0 },
});

const model = mongoose.model('ShopModels', shopSchema);

module.exports = model;