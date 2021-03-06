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
    'listenPort': 80,
    'tempUploadFolder': './temp',
    'importTextOffset': 32,
    'isTesting': false
}

// Storage for all of the MCImages
MCImages = {};

// These will be the colours we scraped
MC_COLOUR_SETS = JSON.parse(fs.readFileSync('./shared/colour_sets.json'));

// Let's make all the colours from our scape become the Colour object.
for (let setKey of Object.keys(MC_COLOUR_SETS)) {
    for (let i in MC_COLOUR_SETS[setKey]) {
        MC_COLOUR_SETS[setKey][i] = Colour.fromArray(MC_COLOUR_SETS[setKey][i]);
    }
}

// Middleware
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('./MapAPI'));

// Simple root
app.get('/', (req, res) => {
    res.send(MC_COLOUR_SETS);
});

// Bind the listener
let listener = app.listen(MCMapSettings.listenPort, () => {
    console.log(`MCMap-Tool is now listening on port ${MCMapSettings.listenPort}.`);
});

listener.on('close', () => {
    console.log('MCMap web listener closed.');
})

module.exports = {
    listener: listener,
    app: app
}