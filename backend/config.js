'use strict';

exports = module.exports = {
    init,
    get
};

var assert = require('assert'),
    debug = require('debug')('cubby:config'),
    path = require('path'),
    safe = require('safetydance');

let gConfig = {
    collabora: {
        host: ''
    }
};

function init(configFilePath) {
    assert.strictEqual(typeof configFilePath, 'string');

    try {
        gConfig = require(path.resolve(configFilePath));
    } catch (e) {
        debug(`Unable to load config file at ${configFilePath}. Using defaults.`);
    }

    debug('loaded config:', gConfig);
}

// fallback is optional
function get(key, fallback) {
    assert.strictEqual(typeof key, 'string');

    return safe.query(gConfig, key, fallback);
}
