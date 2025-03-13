const mongoose = require('mongoose');

const charSchema = new mongoose.Schema({
    name: {type: String, required: true},
    numClaims: {type: Number, required: true, default: 0}
});

const model = mongoose.model('CharModels', charSchema);

module.exports = model;