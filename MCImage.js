// This will be responsible for converting the images into a form that can be read by Minecraft Maps

// File Handling
const fs   = require('fs');
const zlib = require('zlib');

// Image Processing
const pixels = require('image-pixels');
const sharp  = require('sharp');

// MC Data handling
const nbt = require('node-nbt');

class Colour {
    // TODO Maybe make a clamp function for each of these setters...
    r;
    g;
    b;
    a;

    constructor(r=255, g=255, b=255, a=255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    
    // This doesn't take alpha into account
    distance(secondColour) {
        // Calculate deltas
        let dr = this.r - secondColour.r;
        let db = this.b - secondColour.b;
        let dg = this.g - secondColour.g;

        // Good old Pythagoras <3
        return Math.sqrt(dr*dr + db*db + dg*dg);
    }

    static fromArray(obj) {
        if (!(obj instanceof Array)) {
            throw new Error(`Expected Array, recieved ${obj.constructor.name}`);
        }

        return new Colour(obj[0], obj[1], obj[2], obj[3]);
    }

    toString() {
        return `${this.r}, ${this.g}, ${this.b}, ${this.a}`;
    }
}

class MCMap {
    colourIds = [];

    // They should always be 128, maybe make them depend on the MCImage constant but whatever.
    height = 128;
    width  = 128;

    // NBT Related Stuff
    // TODO Make this an enum
    dimension = 0; // 0 = The Overworld, -1 = The Nether, 1 = The End

    centre = {
        x: 0,
        y: 0, // Useless
        z: 0
    }

    constructor(colourIds, centre) {
        this.centre = centre || this.centre;
        this.colourIds = colourIds || this.colourIds;
    }

    async nbtData() {
        // Ready the NBT Data in JSON
        let nbtMapData = {
            type: nbt.TAG.COMPOUND,
            name: '',
            val: [{
                name: 'data',
                type: nbt.TAG.COMPOUND,
                val: [{
                        name: 'scale',
                        type: nbt.TAG.BYTE,
                        val: 0
                    },
                    {
                        name: 'dimension',
                        type: nbt.TAG.BYTE,
                        val: this.dimension
                    },
                    {
                        name: 'trackingPosition',
                        type: nbt.TAG.BYTE,
                        val: 0
                    },
                    {
                        name: 'locked',
                        type: nbt.TAG.BYTE,
                        val: 1
                    },
                    {
                        name: 'height',
                        type: nbt.TAG.SHORT,
                        val: this.height
                    },
                    {
                        name: 'width',
                        type: nbt.TAG.SHORT,
                        val: this.width
                    },
                    {
                        name: 'xCenter',
                        type: nbt.TAG.INT,
                        val: this.centre.x
                    },
                    {
                        name: 'zCenter',
                        type: nbt.TAG.INT,
                        val: this.centre.z
                    },
                    {
                        name: 'colors',
                        type: nbt.TAG.BYTEARRAY,
                        val: Int8Array.from(this.colourIds)
                    }
                ]
            }]
        };

        // Get a non-compressed version of the NBT data
        let rawNbtData = nbt.NbtWriter.writeTag(nbtMapData);

        // Compress the data using GZIP
        let compressedData = await (new Promise((resolve, reject) => {
            zlib.gzip(rawNbtData, (err, data) => {
                if (err) return reject(err);
                
                resolve(data);
            });
        }));

        // Get the NBT data in its own form
        return compressedData;
    }

    async saveNbtData(filePath) {
        // Get the nbtData of the image
        let currentNbtData = await this.nbtData();

        // Write the compressed data to a file
        fs.writeFileSync(filePath, currentNbtData);
    }
}

class MCImage {
    #imagePath;
    colourSet;
    setVersion; // TODO Get the versions of the sets (i.e. 1.12 = 1343)

    // How many maps along and up
    totalMapsWidth  = 1;
    totalMapsHeight = 1;

    // TODO change this to private and make it static
    // This just prevents specific colours being used, such as transparent colours etc.
    forbiddenIds = {
        '1.12': {
            0: true,
            1: true,
            2: true,
            3: true
        }
    }

    static MC_IMG_WIDTH  = 128;
    static MC_IMG_HEIGHT = 128;

    get imagePath() {
        return this.#imagePath;
    }

    constructor(imagePath, colourSet, setVersion, totalMapsWidth = 1, totalMapsHeight = 1) {
        // Do some checks
        if (!fs.existsSync(imagePath)) {
            throw new Error('Path does not exist.');
        }

        this.#imagePath = imagePath;
        this.colourSet  = [...colourSet]; // Make a copy so Node isn't weird
        this.setVersion = setVersion;

        // Setup multiple maps
        this.totalMapsWidth  = totalMapsWidth;
        this.totalMapsHeight = totalMapsHeight;

        // Make sure they are all Colour objects.
        for (let i in this.colourSet) {
            if (!(this.colourSet[i] instanceof Colour)) {
                // It must be an array from the scrape we did.
                this.colourSet[i] = Colour.fromArray(this.colourSet[i]);
            }
        }
    }

    async readyImage(fitMode = 'fill') {
        // Use sharp to shrink the image to a minecraft size and convert any other formats to PNG
        let imgBuffer = await sharp(this.imagePath)
            .resize({width: MCImage.MC_IMG_WIDTH * this.totalMapsWidth, height: MCImage.MC_IMG_HEIGHT * this.totalMapsHeight, fit: fitMode})
            .png()
            .toBuffer();

        // Array of MC Maps
        let maps = [];

        // Make it so we don't need to do maths for loads of colours.
        let colourLookup = {};

        // For multiple map processing break it down into smaller maps.
        for (let y = 0; y < this.totalMapsHeight; y++) {
            for (let x = 0; x < this.totalMapsWidth; x++) {
                // TODO Check if we need to generate multiple maps
                // TODO Potentially use a Promise.all or some way of processing multiple at once?
                let mapSelection = await sharp(imgBuffer)
                    .extract({left: x*MCImage.MC_IMG_WIDTH, top: y*MCImage.MC_IMG_HEIGHT, width:MCImage.MC_IMG_WIDTH, height:MCImage.MC_IMG_HEIGHT})
                    .png()
                    .toBuffer();
                
                // MC-ify the colours with in the image
                let {data, width, height} = await pixels(mapSelection);

                // The new colour ids for the map
                let colourIds  = [];

                // Get the colours and normalise
                for (let i = 0; i < data.length; i += 4) {
                    let dataSnip = Array.from(data.subarray(i, i + 4));
                    let c = Colour.fromArray(dataSnip);

                    // Get the newly mapped colour and its corresponding id.
                    let {colour, id} = colourLookup[c.toString()] || this.normaliseColour(c);

                    // Save the colour id to the lookup.
                    colourLookup[c.toString()] = {colour: colour, id: id};

                    // Make sure that the id is an integer
                    colourIds.push(parseInt(id));
                    
                    // If an image couldn't be found - for some reason - then cause an error.
                    if (id == -1) {
                        throw new Error('Unable to find replacement colour for colour: ' + JSON.stringify(c));
                    }
                }

                // Load the map
                let map = new MCMap(colourIds);

                // Add the map
                maps.push(map);
            }
        }

        return maps;
    }

    normaliseColour(colour) {
        // Setup our return values
        let closestColour;
        let lastDistance = Infinity;
        let id = -1;

        for (let i in this.colourSet) {
            // Make sure that it isn't a forbidden colour such as transparent or something like that.
            if (this.forbiddenIds[this.setVersion] && this.forbiddenIds[this.setVersion][i]) continue;

            // Get the colour from the colour set
            let validColour = this.colourSet[i];

            // Calculate the distances between them
            let distance = colour.distance(validColour);
            
            // If it is less than the last make sure that we grab it.
            if (distance < lastDistance) {
                closestColour = validColour;
                lastDistance  = distance;
                id = i;
            }

            // There can be nothing better than a perfect match.
            if (distance == 0) {
                break;
            }
        }

        // Return the chosen colour and its colour ID
        return {colour: closestColour, id: parseInt(id)};
    }
}

module.exports = {
    MCImage: MCImage,
    Colour: Colour,
    MCMap: MCMap
}