const crypto = require('crypto');
const path = require('path');
const {MCImage} = require('../MCImage');
const chai = require('chai');
const sinon = require('sinon');

// Apparently this should only be ran once so let's start the webserver
const index = require('../index');

MCMapSettings.isTesting = true;

// Close the web server upon finishing...
after(() => {
    index.listener.close();
})

module.exports = {
    API_MCMAP_ENDPOINT: '/',
    TEST_IMAGE_PATH: './test/data/funny_image.jpg',
    ILLEGAL_MEDIA_PATH: './test/data/illegal_media.mp4',
    addMap: (width, height, setVer, filepath, id) => {
        MCImages[id] = new MCImage(filepath, MC_COLOUR_SETS[setVer], setVer, width, height);
    },
    isMCImage: (image) => {
        let expectedElements = ["colourSet", "setVersion", "totalMapsWidth", "totalMapsHeight", "forbiddenIds"];
        chai.expect(Object.keys(image).sort()).to.deep.equal(expectedElements.sort());
    },
    
    binaryParser: (res, cb) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', function (chunk) {
            res.data += chunk;
        });
        res.on('end', function () {
            cb(null, Buffer.from(res.data, 'binary'));
        });
    },
    preparesMaps: async (run, id) => {
        let spy = sinon.spy(MCImages[id], 'readyImage');

        // Run it
        let resp = await run(id);

        return {
            spy: spy,
            resp: resp
        };
    },
    index: index,
    createMd5(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }
}