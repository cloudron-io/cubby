'use strict';

exports = module.exports = {
    get
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:files'),
    fs = require('fs-extra'),
    async = require('async'),
    path = require('path'),
    util = require('util'),
    exec = util.promisify(require('child_process').exec),
    mime = require('./mime.js'),
    MainError = require('./mainerror.js');

async function get(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`get: ${username}`);

    return [];
}

