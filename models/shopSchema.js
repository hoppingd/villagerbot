const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    serverID: {type: String, required: true, unique: true},
    merchandise: {
        type: [{
            name: { type: String, default: null },
            rarity: { type: Number, default: 0 },
            isPurchased: {type: Boolean, default: false}
        }],
    },
    lastRefreshed: {type: Date, default: 0}
});

const model = mongoose.model('ShopModels', shopSchema);

module.exports = model;