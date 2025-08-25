const mongoose = require('mongoose');

const serverDataSchema = new mongoose.Schema({
    serverID: { type: String, required: true, unique: true },
    isPrivate: { type: Boolean, default: false },
});

const model = mongoose.model('ServerDataModels', serverDataSchema);

module.exports = model;