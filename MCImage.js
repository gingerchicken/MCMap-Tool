// This will be responsible for converting the images into a form that can be read by Minecraft Maps
const fs = require('fs');

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
}

class MCImage {
    #imagePath;
    colourSet;

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

    readyImage() {
        // TODO Add this and load all of the pixels into memory and normalise them.
        // Maybe use something like sharp but I am not too sure just yet
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