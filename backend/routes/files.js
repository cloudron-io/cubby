'use strict';

exports = module.exports = {
    add,
    get,
    update,
    remove
};

var assert = require('assert'),
    files = require('../files.js'),
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

function add(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
}

function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var raw = boolLike(req.query.raw);
    var filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    files.get(req.user.username, filePath, function (error, result) {
        if (error && error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        if (error) return next(new HttpError(500, error));

        if (raw) {
            if (result.isDirectory) return next(new HttpError(417, 'raw is not supported for directories'));

            return res.sendFile(result._fullFilePath);
        }

        // remove private fields
        delete result._fullFilePath;

        return next(new HttpSuccess(200, result));
    });
}

function update(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
}

function remove(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
}
