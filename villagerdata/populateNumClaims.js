// POPULATES NUMCLAIMS WITH TEST DATA
const mongoose = require('mongoose');
const { mongodbSRV } = require('../config.json');
const charModel = require('../models/charSchema'); 
const villagers = require('./animal-crossing-villagers.json');

mongoose.connect(mongodbSRV).then(() => {
    console.log('Connected to the database!');
}).catch((err) => {
    console.error('Database connection error:', err);
});

function generateClaims(minClaims = 5, maxClaims = 10000, alpha = 5) {
    // Apply the power-law distribution to generate claims
    const randomValue = Math.random(); // Random value between 0 and 1
    const exponentialValue = Math.pow(randomValue, alpha); // Exponentially scale the random value
    
    // Scale the result to the desired range
    let claim = (maxClaims - minClaims) * exponentialValue + minClaims;

    // Ensure claims are within the defined range
    claim = Math.floor(claim); // Round down to the nearest integer
    claim = Math.max(claim, minClaims); // No claims below minClaims
    claim = Math.min(claim, maxClaims); // No claims above maxClaims

    return claim;
}

async function populateClaims() {
    for (const villager of villagers) {
        // Generate power-law distributed numClaims for each villager
        let numClaims = generateClaims();

        // Create or update the charModel for each villager
        const charData = await charModel.findOne({ name: villager.name });

        if (!charData) {
            // If the character doesn't exist, create a new one with the computed numClaims
            await charModel.create({
                name: villager.name,
                numClaims: numClaims
            });
        } else {
            // If the character exists, update the numClaims
            charData.numClaims = numClaims;
            await charData.save();
        }

        console.log(`Character: ${villager.name}, Claims: ${numClaims}`);
    }

    console.log('Finished populating character claims!');
}

// Call the function to populate the claims
populateClaims().catch(err => console.error('Error populating claims:', err));