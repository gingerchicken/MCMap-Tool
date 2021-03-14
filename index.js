// Imports
const express = require('express');
const fs      = require('fs');

// Local Imports
const {MCImage, Colour} = require('./MCImage');

// Defs from Imports
let app     = express();

// Global Bad.
// Settings for the web application
MCMapSettings = {
    'listenPort': 80
}

// These will be the colours we scraped
MC_COLOUR_SETS = JSON.parse(fs.readFileSync('./shared/colour_sets.json'));

// Let's make all the colours from our scape become the Colour object.
for (let setKey of Object.keys(MC_COLOUR_SETS)) {
    for (let i in MC_COLOUR_SETS[setKey]) {
        MC_COLOUR_SETS[setKey][i] = Colour.fromArray(MC_COLOUR_SETS[setKey][i]);
    }
}

// Simple root
app.get('/', (req, res) => {
    res.send(MC_COLOUR_SETS);
});

// Bind the listener
let listener = app.listen(MCMapSettings.listenPort, () => {
    console.log(`MCMap-Tool is now listening on port ${MCMapSettings.listenPort}.`);
});

// Example Code
let example = new MCImage('./test/data/javascript_meme.png', MC_COLOUR_SETS['1.12'], '1.12');

// Generate something that is 16 maps tall and 16 maps wide
example.totalMapsHeight = 16;
example.totalMapsWidth  = 16;

// Save them all from id zero to 16^2
example.readyImage()
.then((maps) => {
    let i = 0;
    for (let map of maps) {
        map.saveNbtData(`map_${i}.dat`);

        i++;
    }
})

module.exports = {
    listener: listener,
    app: app
}