'use strict';

exports = module.exports = {
    add,
    get,
    update,
    remove,
    recent
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:files'),
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

async function add(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var directory = boolLike(req.query.directory);
    var filePath = decodeURIComponent(req.query.path);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (!(req.files && req.files.file) && !directory) return next(new HttpError(400, 'missing file or directory'));
    if ((req.files && req.files.file) && directory) return next(new HttpError(400, 'either file or directory'));

    var mtime = req.fields && req.fields.mtime ? new Date(req.fields.mtime) : null;

    debug('add:', filePath, mtime);

    try {
        if (directory) await files.addDirectory(req.user.username, filePath);
        else await files.addFile(req.user.username, filePath, req.files.file.path, mtime);
    } catch (error) {
        if (error.reason === MainError.ALREADY_EXISTS) return next(new HttpError(409, 'already exists'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

async function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var type = req.query.type;
    var filePath = decodeURIComponent(req.query.path);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (type && (type !== 'raw' && type !== 'download')) return next(new HttpError(400, 'type must be either empty, "download" or "raw"'));

    debug(`get: ${filePath} type:${type}`);

    let result;

    try {
        result = await files.get(req.user.username, filePath);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    if (type === 'raw') {
        if (result.isDirectory) return next(new HttpError(417, 'type "raw" is not supported for directories'));
        return res.sendFile(result._fullFilePath);
    } else if (type === 'download') {
        if (result.isDirectory) return next(new HttpError(417, 'type "download" is not supported for directories'));
        return res.download(result._fullFilePath);
    }

    // remove private fields
    delete result._fullFilePath;

    next(new HttpSuccess(200, result));
}

async function update(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const filePath = decodeURIComponent(req.query.path);
    const action = req.query.action;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug(`update: [${action}] ${filePath}`);

    if (action === 'move') {
        const newFilePath = decodeURIComponent(req.query.new_path);
        if (!newFilePath) return next(new HttpError(400, 'move action requires new_path argument'));

        try {
            files.move(req.user.username, filePath, newFilePath);
        } catch (error) {
            if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
            return next(new HttpError(500, error));
        }

        return next(new HttpSuccess(200, {}));
    } else {
        return next(new HttpError(400, 'unknown action'));
    }
}

async function remove(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var filePath = decodeURIComponent(req.query.path);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug('remove:', filePath);

    try {
        await files.remove(req.user.username, filePath);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

async function recent(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    debug('recent');

    let result = [];

    try {
        result = await files.recent(req.user.username);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    const entry = {
        fileName: 'Recent',
        filePath: '/',
        size: 0,
        mtime: Date.now(),
        isDirectory: true,
        isFile: false,
        mimeType: 'inode/recent',
        files: result
    };

    next(new HttpSuccess(200, entry));
}