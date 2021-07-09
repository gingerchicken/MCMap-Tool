const express = require('express');
const router  = express.Router();

const multer   = require('multer');
const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');
const archiver = require('archiver');

const {MCImage} = require('./MCImage');

// Unique string generator
function generateUniqueString() {
    return crypto.randomBytes(32).toString('hex');
}

// Used to compress a directory
function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        archive
            .directory(source, false)
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

// Multer Stuff
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            if (!fs.existsSync(MCMapSettings.tempUploadFolder)) {
                fs.mkdirSync(MCMapSettings.tempUploadFolder);
            }

            cb(null, MCMapSettings.tempUploadFolder)
        },
        filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + '.' + file.mimetype.split('/').pop())
        }
    })
});

// Used to suppress some multer errors incase users decide to upload the wrong content.
function multerSupress(stackObj, errMessage) {
    return (req, res, next) => {
        stackObj(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).send(errMessage);
            } else if (err) {
                next(err);
            } else {
                next();
            }
        });
    }
}

// List all of the image ids (maybe do by page or something)
router.get('/', (req, res) => {
    res.send(Object.keys(MCImages));
});

// Add an image
router.post('/', multerSupress(upload.single('file'), 'Invalid Data'), async (req, res) => {
    let data = req.body;

    if (!data) return res.status(400).send();

    // File data
    let file = req.file;

    // This is the width in terms of the maps, so 1:1 will be one map and 4:4 will be four maps along, four maps up etc.
    let width  = parseInt(data.width);
    let height = parseInt(data.height);

    let setVer = data.setVersion || '1.12'; // Not sure if I am going to include this for now.

    // This will be the colour to be later set relative to the set version.
    let set;

    let delFile = () => {
        if (MCMapSettings.tempUploadFolder && !MCMapSettings.isTesting) {
           fs.unlinkSync(file.path);
        }
    }

    // Convert and verify.
    try {
        // Get the colour set.
        set = MC_COLOUR_SETS[setVer];

        // Check the numbers
        if (width.toString() == "NaN" || height.toString() == "NaN") throw new Error('Expected numbers, recieved something else.');
        if (width <= 0 || height <= 0) throw new Error('Dimensions must be greater than zero.');

        // Check the set
        if (!set) throw new Error('Set does not exist.');

        // Make sure that the file is an image
        if (!file.mimetype.startsWith('image')) throw new Error('Media provided was not an image.');
    } catch (e) {
        // List of allowed error messages.
        switch (e.message) {
            case 'Media provided was not an image.': {
                res.status(415);
                res.statusMessage = e.message;
                break;
            }
            case 'Set does not exist.':
            case 'Expected numbers, recieved something else.':
            case 'Dimensions must be greater than zero.':
                res.statusMessage = e.message;
                res.status(400);
                break;
            default: {
                console.error(e);
                res.status(400);
            }
        }

        delFile();
        return res.send();
    }

    // Generate the unique identifier of some sort.
    let uniqueKey = generateUniqueString();

    // Create the object
    MCImages[uniqueKey] = new MCImage(file.path, set, setVer, width, height);

    // Cannot figure out how 2 {uniqueKey: something} so imma do it easily.
    let respData = {};
    respData[uniqueKey] = MCImages[uniqueKey]

    // Send it to the client.
    res.send(respData);
});

// Get an image by Id
router.get('/:id/', (req, res) => {
    let id = req.params.id;

    if (!MCImages[id]) return res.status(404).send();
    
    res.send(MCImages[id]);
});

// Delete an image from the current list of images
router.delete('/:id/', (req, res) => {
    let id = req.params.id;

    if (!MCImages[id]) return res.status(404).send();
    
    delete MCImages[id];

    res.status(200).send();
});

// TODO maybe make this middleware?
// I used this a bunch so I decided to make it its own function
async function verifyMaps(req, res) {
    let id = req.params.id;

    if (!MCImages[id]) {
        res.status(404).send();
        return false;
    }

    // If the image does not have any active maps, generate them.
    if (!MCImages[id].maps)
        MCImages[id].maps = await MCImages[id].readyImage();

    return true;
}

// Generate an image's map files and send them to the client
router.get('/:id/maps', async (req, res) => {
    if (!(await verifyMaps(req, res))) return;

    let id = req.params.id;
    
    res.status(200).send(MCImages[id].maps);
});

// Get the map files
router.get('/:id/files', async (req, res) => {
    if (!(await verifyMaps(req, res))) return;

    let id = req.params.id;
    
    // Check if it is locked
    if (MCImages[id].isZipping) {
        return res.status(423).send();
    }

    MCImages[id].isZipping = true;

    // Create the files
    let savePath = path.join(MCMapSettings.tempUploadFolder, id);
    let zipPath  = savePath + '.zip';

    // I don't want to repeat myself.
    async function saveMaps() {
        let promises = [];
        // Make sure that we add all the required files.
        for (let i in MCImages[id].maps) {
            promises.push(
                MCImages[id].maps[i].saveNbtData(path.join(savePath, `map_${i}.dat`))
            );
        }
        
        await Promise.all(promises);
    }

    // Make the directory
    if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath);
        await saveMaps();
    } else if (MCMapSettings.isTesting) {
        // If we are testing, we want to always create them since I cannot delete the folder without fs locking up my tests :/
        await saveMaps();
    }

    // Make sure we are not wasting our time
    if (!fs.existsSync(zipPath) || MCMapSettings.isTesting) {
        // Zip the directory
        await zipDirectory(savePath, savePath + '.zip');
    }

    // Send the zip
    res.status(200).sendFile(path.resolve(zipPath));

    // Remove the zipping mark
    delete MCImages[id]['isZipping'];
});

module.exports = router;