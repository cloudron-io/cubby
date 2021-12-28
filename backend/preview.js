'use strict';

var assert = require('assert'),
    constants = require('./constants.js'),
    crypto = require('crypto'),
    exec = require('util').promisify(require('child_process').exec),
    fs = require('fs-extra'),
    path = require('path');

exports = module.exports = {
    getHash,
    getLocalPath
};

const generators = [{
    name: 'imagemagick',
    mimeTypes: [ 'image/jpeg' ],
    generate: function (fullFilePath) {
        assert.strictEqual(typeof fullFilePath, 'string');

        const hash = crypto.createHash('md5').update(fullFilePath).digest('hex');

        async function createIfNotExists() {
            const targetPath = path.join(constants.THUMBNAIL_ROOT, hash);
            if (fs.existsSync(targetPath)) return;

            try {
                await fs.ensureDir(constants.THUMBNAIL_ROOT);
                await exec(`convert -thumbnail 1024 "${fullFilePath}" "${targetPath}"`);
            } catch (e) {
                console.error(`Failed to create thumbnail for ${fullFilePath}`, e);
            }
        }

        createIfNotExists();

        return hash;
    }
}];

function getHash(mimeType, fullFilePath) {
    assert.strictEqual(typeof mimeType, 'string');
    assert.strictEqual(typeof fullFilePath, 'string');

    const generator = generators.find(function (g) { return g.mimeTypes.indexOf(mimeType) !== -1; });
    if (!generator) return null;

    return generator.generate(fullFilePath);
}

function getLocalPath(hash) {
    assert.strictEqual(typeof hash, 'string');

    const targetPath = path.join(constants.THUMBNAIL_ROOT, hash);
    if (!fs.existsSync(targetPath)) return null;

    return targetPath;
}
