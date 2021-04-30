'use strict';

exports = module.exports = {
    get
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:shares'),
    shares = require('../shares.js'),
    util = require('util'),
    MainError = require('../mainerror.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

function boolLike(arg) {
    if (!arg) return false;
    if (util.isNumber(arg)) return !!arg;
    if (util.isString(arg) && arg.toLowerCase() === 'false') return false;

    return true;
}

async function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    debug('get');

    let result = [];

    try {
        result = await shares.get(req.user.username);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    const entry = {
        fileName: 'Shares',
        filePath: '/',
        size: 0,
        mtime: Date.now(),
        isDirectory: true,
        isFile: false,
        mimeType: 'inode/share',
        files: result
    };

    next(new HttpSuccess(200, entry));
}