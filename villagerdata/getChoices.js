const fs = require('fs');

fs.readFile('data.json', 'utf8', async (err, data) => {
    if (err) {
        console.error('Error reading the JSON file:', err);
        return;
    }

    try {
        const charactersData = JSON.parse(data);
        let species = [];
        let personalities = [];

        for (const character of charactersData) {
            if (!species.includes(character.species)) {
                species.push(character.species)
            }
            if (!personalities.includes(character.personality)) {
                personalities.push(character.personality)
            }
        }
        console.log(species.sort());
        console.log(personalities.sort());
    } catch (error) {
        console.error('Error parsing the JSON data:', error);
    }
})