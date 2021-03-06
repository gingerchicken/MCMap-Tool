// This will be responsible for converting the images into a form that can be read by Minecraft Maps
const fs        = require('fs');
const pixels    = require('image-pixels');
const sharp     = require('sharp');

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

    toByte() {
        // TODO convert it to the weird minecraft way of doing things but idk
        return this;
    }
}

class MCImage {
    #imagePath;
    colourSet;

    static MC_IMG_WIDTH  = 128;
    static MC_IMG_HEIGHT = 128;

    get imagePath() {
        return this.#imagePath;
    }

    constructor(imagePath, colourSet) {
        // Do some checks
        if (!fs.existsSync(imagePath)) {
            throw new Error('Path does not exist.');
        }

        this.#imagePath = imagePath;
        this.colourSet  = [...colourSet]; // Make a copy so Node isn't weird

        // Make sure they are all Colour objects.
        for (let i in this.colourSet) {
            if (!(this.colourSet[i] instanceof Colour)) {
                // It must be an array from the scrape we did.
                this.colourSet[i] = Colour.fromArray(this.colourSet[i]);
            }
        }
    }

    async readyImage() {
        // Use sharp to shrink the image to a minecraft size and convert any other formats to PNG
        let imgBuffer = await sharp('./test/data/funny_image.jpg')
            .resize(MCImage.MC_IMG_WIDTH, MCImage.MC_IMG_HEIGHT)
            .png()
            .toBuffer();
        
        // MC-ify the colours with in the image
        let {data, width, height} = await pixels(imgBuffer);

        let newColours = [];
        // Get the colours and normalise
        console.log(data);
        for (let i = 0; i < data.length; i += 4) {
            let dataSnip = Array.from(data.subarray(i, i + 4));
            let c = Colour.fromArray(dataSnip);

            newColours.push(this.normaliseColour(c));
        }

        // TODO convert to NBT etc.
    }

    get nbtData() {
        // TODO Add this
        // this.readyImage()
        // then dump it to NBT data
    }

    normaliseColour(colour) {
        let closestColour;
        let lastDistance = Infinity;

        for (let validColour of this.colourSet) {
            // Calculate the distance
            let distance = colour.distance(validColour);
            
            // If it is less than the last make sure that we grab it.
            if (distance < lastDistance) {
                closestColour = validColour;
                lastDistance  = distance;
            }

            // There can be nothing better than a perfect match.
            if (distance == 0)
                break;
        }

        return closestColour;
    }
}

module.exports = {
    MCImage: MCImage,
    Colour: Colour
}