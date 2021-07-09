const chai = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');

chai.use(require('chai-http'));

const TestUtils = require('./TestUtils');
const { Stream } = require('stream');

function endpoint(...j) {
    let url = TestUtils.API_MCMAP_ENDPOINT;

    for (let part of j) {
        if (!url.endsWith('/')) url += '/';

        url += `${part}`;
    }

    return url;
}

describe('MapAPI', () => {
    const ITEM_ID = 'verycooltest123';
    const INVALID_ID = 'EEEEEEEEeEe';
    const DIM_MAPS = [1,1];

    // No breaky?
    afterEach(() => {
        // Clear everything
        MCImages = {};
    });

    describe('/', () => {
        describe('GET', () => {
            async function run() {
                let resp = await chai.request(TestUtils.index.app)
                .get(endpoint());
    
                chai.expect(resp.type).equals('application/json');
    
                return resp;
            }

            it('gives expected when empty', async () => {
                let resp = await run();

                let body = resp.body;
                chai.expect(body).to.deep.equal([]);
            });
            it('gives expected when including items', async () => {
                // Add an item
                TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);

                let resp = await run();

                let body = resp.body;
                chai.expect(body).to.deep.equal([ITEM_ID]);
            });
            it('updates after change', async () => {
                // Add an item
                TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);

                let resp = await run();

                // Make sure it was added correctly (same as last time)
                let body = resp.body;
                chai.expect(body).to.deep.equal([ITEM_ID]);

                // Remove it.
                delete MCImages[ITEM_ID];

                // Re-check
                resp = await run();
                body = resp.body;
                chai.expect(body).to.deep.equal([]);
            });
            
            it('can support multiple items', async () => {
                TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);
                TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID + '2');

                resp = await run();
                body = resp.body;
                chai.expect(body.sort()).to.deep.equal([ITEM_ID, ITEM_ID + '2'].sort());
            });
        });

        describe('POST', () => {
            async function run(width, height, setVer, filepath) {
                return await chai.request(TestUtils.index.app)
                .post(endpoint())
                .field('width', width)
                .field('height', height)
                .field('setVersion', setVer)
                .attach('file', fs.readFileSync(filepath), filepath.split('/').pop());
            }

            it('Adds a new map with correct given values', async () => {
                let resp = await run(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH);

                // General tests
                chai.expect(resp).status(200);
                chai.expect(resp.type).equals('application/json');

                // Body tests
                let body = resp.body;
                chai.expect(Object.keys(body)).to.have.lengthOf(1);
                
                // Expect it to be like a random hex 64 string or whatever.
                let id = Object.keys(body).pop();
                chai.expect(id).to.have.lengthOf(64);

                let image = body[id];
                TestUtils.isMCImage(image);
            
                // Local checks (i.e. make sure it was added with correct values)
                chai.expect(MCImages).to.have.property(id);
                for (let i in Object.keys(image)) {
                    MCImages[id][i] = image[i];
                }
            });
            it('rejects invalid set', async () => {
                let resp = await run(1, 1, '-420', TestUtils.TEST_IMAGE_PATH);

                chai.expect(resp).status(400);
                chai.expect(resp.res.statusMessage).to.equal('Set does not exist.', resp.error);
            });
            it('rejects invalid width and height', async () => {
                async function th(w, h, error) {
                    let resp = await run(w, h, '1.12', TestUtils.TEST_IMAGE_PATH);
                    chai.expect(resp.status).to.equal(400, `${w} ${h}`);
                    chai.expect(resp.res.statusMessage).equal(error, resp.error);

                    return resp;
                }

                let ZERO_OR_LESS = 'Dimensions must be greater than zero.';
                let INVALID_NUMB = 'Expected numbers, recieved something else.';

                let zeroOrLess = [
                    [0, 0],
                    [-1, 0],
                    [5, 0],
                    [0, 5],
                    [35, -534],
                    [0.5, 0.3]
                ];
                let invalidNumbers = [
                    ["fifty two thousand one hundred and twelve", "your mother"],
                    ["wife gone", "undefined"],
                    [Math.sqrt(-1), NaN],
                    [NaN, 5],
                    [5, NaN]
                ];

                // Test for zeroOrLess inputs
                for (let input of zeroOrLess) {
                    await th(...input, ZERO_OR_LESS);
                }

                // Test for non-numerical and invalid numbers
                for (let input of invalidNumbers) {
                    await th(...input, INVALID_NUMB);
                }
            });
            it('rejects invalid media types', async () => {
                let resp = await run(1, 1, '1.12', TestUtils.ILLEGAL_MEDIA_PATH);

                chai.expect(resp).status(400);
                chai.expect(resp.res.statusMessage).to.equal('Media provided was not an image.');
            });
        });
    });

    describe('/:id/', () => {
        describe('GET', () => {

            async function run(id) {
                return await chai.request(TestUtils.index.app)
                .get(endpoint(id));
            }

            it('returns map with valid id', async () => {
                // Add the map
                TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);

                let resp = await run(ITEM_ID);
                chai.expect(resp).status(200);
                chai.expect(resp.type).equals('application/json');

                TestUtils.isMCImage(resp.body);
            });
            it('rejects invalid id', async () => {
                let resp = await run(ITEM_ID);

                chai.expect(resp).status(404);
                chai.expect(resp.type).to.not.equal('application/json');
            });
        });

        describe('DELETE', () => {
            const ADDED_IDS = [ITEM_ID, ITEM_ID + '2', '3' + ITEM_ID];
            const TARGET_ID = ITEM_ID;

            beforeEach(async () => {
                for (let id of ADDED_IDS) {
                    TestUtils.addMap(1, 1, '1.12', TestUtils.TEST_IMAGE_PATH, id);
                }

                chai.expect(Object.keys(MCImages).sort()).to.deep.equal(ADDED_IDS.sort());
            });

            async function run(id) {
                return await chai.request(TestUtils.index.app)
                .delete(endpoint(id));
            }

            it('removes the map from the list', async () => {
                let before = Object.keys(MCImages);
                let resp = await run(ITEM_ID);
                let after = Object.keys(MCImages);

                // Check the request
                chai.expect(resp).status(200);

                // Check actual end result
                chai.expect(before.sort()).to.not.deep.equal(after.sort(), 'No change was made.');

                // Make our predictions
                let prediction = [];
                for (let id of before) {
                    if (id == TARGET_ID) continue;

                    prediction.push(id);
                }

                // Compare to reality
                chai.expect(after.sort()).to.deep.equal(prediction.sort());
            });

            it('rejects invalid id', async () => {
                let before = Object.keys(MCImages);
                let resp = await run(INVALID_ID);
                let after = Object.keys(MCImages);

                // Check the request
                chai.expect(resp).status(404);

                // Check that nothing happened.
                chai.expect(before.sort()).to.deep.equal(after.sort(), 'Changes were made.');
            });
        });
    });

    describe('/:id/maps', () => {
        beforeEach(() => {
            TestUtils.addMap(...DIM_MAPS, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);
        });

        describe('GET', () => {
            async function run(id) {
                return await chai.request(TestUtils.index.app)
                .get(endpoint(id, 'maps'));
            }

            it('returns maps', async () => {
                let resp = await run(ITEM_ID);

                // Check resp
                chai.expect(resp).status(200);
                chai.expect(resp.type).equals('application/json');

                // Check values
                let body = resp.body;
                chai.expect(body).to.have.length(DIM_MAPS[0]*DIM_MAPS[1]);

                // Check the maps
                for (let map of body) {
                    chai.expect(map.colourIds).to.have.length(128*128);
                }
            });

            it('rejects invalid id', async () => {
                let resp = await run(INVALID_ID);
                
                chai.expect(resp).status(404);
            });
            it('prepares maps when required', async () => {
                let spy = sinon.spy(MCImages[ITEM_ID], 'readyImage');

                // Run it
                await run(ITEM_ID);

                chai.expect(spy.called).to.be.true;
            });
            it('does not prepare maps when not required', async () => {
                let spy = sinon.spy(MCImages[ITEM_ID], 'readyImage');

                // Run it twice
                await run(ITEM_ID);
                await run(ITEM_ID);

                chai.expect(spy.callCount).to.be.equal(1);

                // Let's mess with it >:D
                delete MCImages[ITEM_ID]['maps'];

                await run(ITEM_ID);

                chai.expect(spy.callCount).to.be.equal(2);
            });
        });
    });

    describe('/:id/files', () => {
        const REAL_ZIP_PATH = path.join(MCMapSettings.tempUploadFolder, ITEM_ID) + '.zip';

        async function run(id) {
            return await chai.request(TestUtils.index.app)
            .get(endpoint(id, 'files'))
            .buffer()
            .parse(TestUtils.binaryParser)
            .timeout(0);
        }

        beforeEach(async () => {
            TestUtils.addMap(...DIM_MAPS, '1.12', TestUtils.TEST_IMAGE_PATH, ITEM_ID);
        })

        describe('GET', () => {
            it('returns zip file', async () => {
                let resp = await run(ITEM_ID);

                chai.expect(resp).status(200);
                chai.expect(resp.type).to.equal('application/zip');
            });

            // This test is annoying and doesn't behave how it should due to metadata - fix in future.
            it('returns expected zip file');// , async () => {
            //     // For now I will simply compare the hash... kinda poor but I don't want to install copious amounts of packages...
            //     let resp = await run(ITEM_ID);
                
            //     let hash = TestUtils.createMd5(resp.body.toString());
            //     let expectedHash = TestUtils.createMd5(fs.readFileSync('./test/data/expected_zip.zip'));

            //     chai.expect(hash).to.equal(expectedHash);
            // });
            it('returns expected dat file within zip');
            it('rejects invalid id', async () => {
                let resp = await run(INVALID_ID);

                chai.expect(resp).status(404);
                chai.expect(resp.type).to.not.equal('application/zip');
                chai.expect(resp.body).to.have.length.lessThan(16);
            });

            it('does not prepare maps when not required', async () => {
                // Call it before anything happens.
                await run(ITEM_ID);

                let {spy, resp} = await TestUtils.preparesMaps(run, ITEM_ID);

                chai.expect(spy.calledOnce).to.be.false;
                chai.expect(resp).status(200);
                chai.expect(resp.type).to.equal('application/zip');
            });
            it('prepares maps when required', async () => {
                let {spy, resp} = await TestUtils.preparesMaps(run, ITEM_ID);

                chai.expect(spy.calledOnce).to.be.true;
                chai.expect(resp).status(200);
                chai.expect(resp.type).to.equal('application/zip');
            });

            it('doesn\'t regenerate already generated files');
            // // Really poor test
            // it('doesn\'t regenerate already generated files', async () => {
            //     // Ready everything up.
            //     MCImages[ITEM_ID].maps = await MCImages[ITEM_ID].readyImage();
            //     let mapSpies = [];
                
            //     // RED SPIES IN THE BASE!!1!
            //     // Basically just spy on all of the saveNbtData functions
            //     for (let map of MCImages[ITEM_ID].maps) {
            //         mapSpies.push(sinon.spy(map, 'saveNbtData'));
            //     }

            //     // Call it many times.
            //     let resps = [];
            //     for (let i = 0; i < 2; i++) {
            //         resps.push(await run(ITEM_ID));
            //     }

            //     // Make sure it only did it once.
            //     for (let spy of mapSpies) {
            //         chai.expect(spy.callCount).to.be.equal(1, 'Make sure you deleted the temp folder before running the test!');
            //     }

            //     const DUMB_PHRASE = 'biggamingmoment';
            //     // More crude way of checking
            //     fs.writeFileSync(REAL_ZIP_PATH, DUMB_PHRASE);
            //     // In theory it should check that it is there and just not bother if it is there.
            //     await run(ITEM_ID);

            //     chai.expect(fs.readFileSync(REAL_ZIP_PATH).toString()).to.equal(DUMB_PHRASE);
            // }).timeout(0);

            it('locks requests when already processing', async () => {
                let promises = [run(ITEM_ID), run(ITEM_ID)];

                let resps = await Promise.all(promises);
                
                // We don't care which way they reject but as long as one causes the other to reject
                chai.expect(resps[0].status + resps[1].status).to.equal(200 + 423);

                for (let resp of resps) {
                    switch (resp.status) {
                        case 200: {
                            chai.expect(resp.type).to.equal('application/zip');
                            break;
                        }
                        case 423: {
                            chai.expect(resp.type).to.not.equal('application/zip');
                            break;
                        }
                    }
                }
            });

            it('allows new requests after unlock', async () => {
                let promises = [run(ITEM_ID), run(ITEM_ID)];

                let resps = await Promise.all(promises);
                resps.push(await run(ITEM_ID));
                
                // We don't care which way they reject but as long as one causes the other to reject
                let sigstatus = 0;
                for (let resp of resps) {
                    sigstatus += resp.status;
                }
                chai.expect(sigstatus).to.equal(200 + 423 + 200);
                
                // Check some things
                let lastResp = resps[resps.length - 1];
                chai.expect(lastResp).status(200); // duuuh... unless?
                chai.expect(lastResp.type).to.equal('application/zip');
                chai.expect(lastResp.body.length).to.be.greaterThan(1024, 'Seems too small for a zip file.');
            });
        })
    });
});