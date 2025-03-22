const fs = require('fs');

// Read JSON files
const villager = JSON.parse(fs.readFileSync('villager.json', 'utf8'));
const special_character = JSON.parse(fs.readFileSync('special_character.json', 'utf8'));
const amiibo = JSON.parse(fs.readFileSync('amiibo.json', 'utf8'));
const ereader = JSON.parse(fs.readFileSync('ereader.json', 'utf8'));

let combinedData = [...villager, ...special_character];

combinedData = combinedData.reduce((acc, current) => {
    const exists = acc.some(item => item.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") === current.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, ""));
    if (!exists) {
        current.is_special = special_character.some(special => special.name === current.name);
        // handle edge case
        if (current.name == "Timmy and Tommy") {
            current.name = "Timmy";
            current.name_sort = "Timmy";
            acc.push(current);
            const copy = Object.assign({}, current);
            copy.name = "Tommy";
            copy.name_sort = "Tommy";
            acc.push(copy);
        }
        else {
            acc.push(current);
        }
    }
    else {
        console.log("there's a dupe");
    }
    return acc;
}, []);


combinedData.forEach(item => {
    const amiiboMatch = amiibo.find(amiiboInfo => (amiiboInfo.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") === item.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") || (amiiboInfo._pageName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") === item.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, ""))));
    if (amiiboMatch) {
        //console.log(`Updated ${item.name} with amiibo image url.`)
        item.image_url = amiiboMatch.image_front_url;  // Update the image_url with image_front_url
    }
    else {
        const ereaderMatch = ereader.find(ereaderInfo => (ereaderInfo.villager.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") === item.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") || (ereaderInfo.Page.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") === item.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, ""))));
        if (ereaderMatch) {
            //console.log(`Updated ${item.name} with ereader image url.`)
            item.image_url = ereaderMatch.image_front;  // Update the image_url with image_front
        } else console.log(`${item.name} is missing a card image.`);
        
    }
});

// Step 4: Sort the combined data alphabetically by 'name'
combinedData.sort((a, b) => a.name.localeCompare(b.name));

// Step 5: Write the final result to a new JSON file
fs.writeFileSync('data.json', JSON.stringify(combinedData, null, 2), 'utf8');

console.log('Final JSON created successfully!');

process.exit();