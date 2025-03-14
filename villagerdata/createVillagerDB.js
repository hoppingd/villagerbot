const { mongodbSRV } = require('../config.json');
const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect(mongodbSRV).then(() => {
    console.log('Connected to the database!');
}).catch((err) => {
    console.log(err);
});

const charSchema = new mongoose.Schema({
    name: {type: String, required: true},
    numClaims: {type: Number, required: true, default: 0}
});

const model = mongoose.model('CharModels', charSchema);

fs.readFile('data.json', 'utf8', async(err, data) => {
    if (err) {
        console.error('Error reading the JSON file:', err);
        return;
      }
    
      try {
        const charactersData = JSON.parse(data);
    
        for (const character of charactersData) {
          const characterName = character.name;
    
          // Check if the character already exists in the database
          const existingCharacter = await model.findOne({ name: characterName });
    
          if (!existingCharacter) {
            // If the character doesn't exist, create a new document
            const newCharacter = new model({
              name: characterName,
              numClaims: 0  // Set the default number of claims to 0
            });
    
            await newCharacter.save();
            console.log(`Inserted new character: ${characterName}`);
          } else {
            // If the character already exists, just log a message
            console.log(`Character "${characterName}" already exists in the database.`);
          }
        }
      } catch (error) {
        console.error('Error parsing the JSON data:', error);
      }
})