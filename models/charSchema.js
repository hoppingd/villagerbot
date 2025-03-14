const mongoose = require('mongoose');

const charSchema = new mongoose.Schema({
    name: {type: String, required: true},
    numClaims: {type: Number, required: true, default: 0}
});

const model = mongoose.model('CharModels', charSchema);

charSchema.index({numClaims: -1});
module.exports = model;