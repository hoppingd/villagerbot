const mongoose = require('mongoose');

const charSchema = new mongoose.Schema({
    name: { type: String, required: true },
    numClaims: { type: Number, required: true, default: 1, min: [1, 'Claims cannot be negative, and every character gets 1 permanent claim.'] }
});

const model = mongoose.model('CharModels', charSchema);

charSchema.index({ numClaims: -1 });
module.exports = model;