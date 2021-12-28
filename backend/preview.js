'use strict';

var assert = require('assert'),
    constants = require('./constants.js'),
    crypto = require('crypto'),
    debug = require('debug')('cubby:preview'),
    exec = require('util').promisify(require('child_process').exec),
    fs = require('fs-extra'),
    path = require('path');

exports = module.exports = {
    getHash,
    getLocalPath
};

const queue = [];
let taskActive = false;

async function process() {
    if (!queue.length || taskActive) return;

    taskActive = true;
    const task = queue.shift();

    debug(`process: hash=${task.hash} fullFilePath:${task.fullFilePath}`);

    await task.generator(task.hash, task.fullFilePath);
    taskActive = false;

    // process next
    process();
}

function enqueue(hash, fullFilePath, generator) {
    if (queue.find(function (t) { return t.hash === hash; })) return;

    debug(`enqueue: hash=${hash} fullFilePath:${fullFilePath}`);

    queue.push({ hash, fullFilePath, generator });
    process();
}

const generators = [{
    name: 'imagemagick',
    mimeTypes: [ 'image/jpeg' ],
    getHash: function (fullFilePath) {
        assert.strictEqual(typeof fullFilePath, 'string');

        const hash = crypto.createHash('md5').update(fullFilePath).digest('hex');
        const targetPath = path.join(constants.THUMBNAIL_ROOT, hash);

        async function generate(hash, fullFilePath) {
            const targetPath = path.join(constants.THUMBNAIL_ROOT, hash);

            debug(`generateImageMagick: hash=${hash} fullFilePath=${fullFilePath}`);

            try {
                await fs.ensureDir(constants.THUMBNAIL_ROOT);
                await exec(`convert -thumbnail 1024 "${fullFilePath}" "${targetPath}"`);
            } catch (e) {
                console.error(`Failed to create thumbnail for ${fullFilePath}`, e);
            }
        }

        if (!fs.existsSync(targetPath)) enqueue(hash, fullFilePath, generate);

        return hash;
    },
}];

function getHash(mimeType, fullFilePath) {
    assert.strictEqual(typeof mimeType, 'string');
    assert.strictEqual(typeof fullFilePath, 'string');

    const generator = generators.find(function (g) { return g.mimeTypes.indexOf(mimeType) !== -1; });
    if (!generator) return null;

    return generator.getHash(fullFilePath);
}

function getLocalPath(hash) {
    assert.strictEqual(typeof hash, 'string');

    const targetPath = path.join(constants.THUMBNAIL_ROOT, hash);
    if (!fs.existsSync(targetPath)) return null;

    return targetPath;
}
