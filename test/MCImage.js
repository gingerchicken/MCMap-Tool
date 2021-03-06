const chai = require('chai');
const assert = require('assert');
const {MCImage, Colour} = require('../MCImage');

describe('MCImage.js', () => {
    let EXAMPLE_COLOUR_SET;
    beforeEach(() => {
        EXAMPLE_COLOUR_SET = [
            [1, 1, 1],
            [123, 123, 43],
            [255, 255, 255]
        ];
    });

    function possibleColours(callback, done, ignoreAlpha=false, spaces = 15) {
        const max = 255;

        if (255 % spaces != 0 && spaces != 0) throw new Error('Invalid spaces passed.');

        // This is O(n^4) but this is only just to test things
        for (let r = 0; r <= max; r += spaces) {
            for (let g = 0; g <= max; g += spaces) {
                for (let b = 0; b <= max; b += spaces) {
                    if (!ignoreAlpha) {
                        for (let a = 0; a <= max; a += spaces) {
                            callback(r, g, b, a, new Colour(r, g, b, a));
                        }
                    } else {
                        callback(r, g, b, 255, new Colour(r, g, b, 255));
                    }
                }
            }
        }

        return done();
    }

    describe('Colour', () => {
        function testConstructor(constructFunc) {
            let {r, g, b, a} = {
                r: 213,
                g: 132,
                b: 54,
                a: 174
            }

            let checkColour = constructFunc(r, g, b, a);

            chai.expect(checkColour.r).to.equal(r);
            chai.expect(checkColour.g).to.equal(g);
            chai.expect(checkColour.b).to.equal(b);
            chai.expect(checkColour.a).to.equal(a);
        }

        describe('#constructor()', () => {
            it('loads correct values', () => {
                testConstructor((...args) => {
                    return new Colour(...args);
                });
            })
        });
        describe('#fromArray()', () => {
            it('loads correct values', () => {
                testConstructor((...args) => {
                    return Colour.fromArray(args);
                });
            });

            it('rejects non-arrays', () => {
                let notArrays = [
                    5,
                    'Hey!',
                    {'gaming': true},
                    new Colour(54, 54, 25)
                ];

                for (let nonArray of notArrays) {
                    assert.throws(() => {
                        Colour.fromArray(nonArray);
                    });
                }
            });
        });
        describe('#distance()', () => {
            let TEST_COLOURS = [
                new Colour(0,0,0),
                new Colour(255, 255, 255),
            ];

            it('returns expected values', (done) => {
                let testColour = new Colour(123, 232, 69);

                possibleColours((r, g, b, a, otherColour) => {
                    let realDistance = Math.sqrt(Math.pow(testColour.r-r, 2) + Math.pow(testColour.g-g, 2) + Math.pow(testColour.b-b, 2));

                    let toFrom = otherColour.distance(testColour);
                    let fromTo = testColour.distance(otherColour);

                    chai.assert(toFrom == realDistance, 'Returned incorrect value on at least one of the requests');
                    chai.assert(toFrom == fromTo, 'Depending on the way round the arguments are fed, there is a different distance');
                }, done);
            });
        });
    });

    describe('MCImage', () => {
        let mcimg;
        beforeEach(() => {
            mcimg = new MCImage('./test/data/funny_image.png', EXAMPLE_COLOUR_SET);
        });

        function coloursEqual(c1, c2) {
            chai.expect(c1.r).to.equal(c2.r, 'Invalid r');
            chai.expect(c1.g).to.equal(c2.g, 'Invalid g');
            chai.expect(c1.b).to.equal(c2.b, 'Invalid b');
            chai.expect(c1.a).to.equal(c2.a, 'Invalid a');
        }

        describe('#constructor()', () => {
            it('loads set of non-colours', () => {
                chai.expect(mcimg.colourSet.length).equal(EXAMPLE_COLOUR_SET.length, 'Not all the colours were loaded');

                for (let i in mcimg.colourSet) {
                    let c1 = mcimg.colourSet[i];
                    let c2 = Colour.fromArray(EXAMPLE_COLOUR_SET[i]);

                    coloursEqual(c1, c2);
                }
            });
        });

        describe('#normaliseColour()', () => {
            it('returns closest in the set', () => {
                coloursEqual(mcimg.normaliseColour(new Colour(0, 0, 0)),        Colour.fromArray(EXAMPLE_COLOUR_SET[0]));
                coloursEqual(mcimg.normaliseColour(new Colour(1, 1, 1)),        Colour.fromArray(EXAMPLE_COLOUR_SET[0]));

                coloursEqual(mcimg.normaliseColour(new Colour(100, 100, 100)),  Colour.fromArray(EXAMPLE_COLOUR_SET[1]));

                coloursEqual(mcimg.normaliseColour(new Colour(253, 0, 232)),    Colour.fromArray(EXAMPLE_COLOUR_SET[2]));
                coloursEqual(mcimg.normaliseColour(new Colour(250, 244, 232)),  Colour.fromArray(EXAMPLE_COLOUR_SET[2]));
            });
        });

        describe('#readyImage()', () => {
            it('doesn\'t reject', async () => {
                await assert.doesNotReject(mcimg.readyImage());
            }).timeout(0);
            it('shrinks image');
        })
    });
});