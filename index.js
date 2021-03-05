// Imports
let express = require('express');

// Defs from Imports
let app     = express();

// Global Bad.
// Settings for the web application
MCMapSettings = {
    'listenPort': 80
}

// Simple root
app.get('/', (req, res) => {
    res.send('hello world');
});

// Bind the listener
let listener = app.listen(MCMapSettings.listenPort, () => {
    console.log(`MCMap-Tool is now listening on port ${MCMapSettings.listenPort}.`);
});

module.exports = {
    listener: listener,
    app: app
}