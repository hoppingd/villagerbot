const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { apiKey } = require('../config.json');

createNewData();

async function createNewData() {
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


    combinedData.forEach(async item => {
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
            }
            else {
                console.log(`${item.name} is missing a card image.`);
                /* DOWNLOAD WIKI IMAGES FOR CARDS WITHOUT ART
                const url = item.image_url;
                const fileName = path.basename(url); // Extract the file name from the URL
                const filePath = path.join(__dirname, 'downloads', fileName); // Save it in a 'downloads' directory
    
                console.log(`Starting download for ${fileName}...`);
    
                try {
                    await downloadImage(url, filePath);
                    console.log(`Downloaded: ${fileName}`);
                } catch (error) {
                    console.log(error);
                    console.error(`Failed to download ${fileName}`);
                }
                    */
            }
        }
    });

    // Step 4: Sort the combined data alphabetically by 'name'
    combinedData.sort((a, b) => a.name.localeCompare(b.name));

    // Step 5: Write the final result to a new JSON file
    fs.writeFileSync('data.json', JSON.stringify(combinedData, null, 2), 'utf8');

    console.log('Final JSON created successfully!');

    process.exit();

    // function to download images from wiki
    async function downloadImage(url, filename) {
        try {
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream' // Make sure we're getting the response as a stream
            });

            // Ensure the directory exists, if not, create it
            const dir = path.dirname(filename);

            // Pipe the image data into a file
            const writer = fs.createWriteStream(filename);
            response.data.pipe(writer);

            // Return a promise to ensure we handle completion of the stream
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve); // Resolves once the file is fully written
                writer.on('error', reject);   // Rejects if there’s any error during the writing process
            });
        } catch (error) {
            console.error(`Error downloading image from ${url}:`, error.message);
        }
    }
}


async function fetch(apiUrl) {
    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                'Content-Type': "application/json",
                'X-Api-Key': `${apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log(data);

        return data;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}