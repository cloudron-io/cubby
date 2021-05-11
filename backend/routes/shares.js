'use strict';

exports = module.exports = {
    list,
    create
};

var assert = require('assert'),
    async = require('async'),
    debug = require('debug')('cubby:routes:shares'),
    shares = require('../shares.js'),
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

async function list(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    debug('list');

    let result = [];

    try {
        result = await shares.list(req.user.username);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    // Collect all file entries from shares
    let sharedFiles = [];
    try {
        await async.each(result, async function (share) {
            let file = await files.get(share.owner, share.filePath);

            // remove private fields
            delete file._fullFilePath;

            sharedFiles.push(file);
        });
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
        files: sharedFiles
    };

    next(new HttpSuccess(200, entry));
}

async function create(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const filePath = decodeURIComponent(req.query.path);
    const receiverUsername = req.query.receiver_username || null;
    const receiverEmail = req.query.receiver_email || null;
    const readonly = boolLike(req.query.readonly);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (!receiverUsername && !receiverEmail) return next(new HttpError(400, 'either receiver_username or receiver_email must be a non-empty string'));
    if (receiverUsername && receiverEmail) return next(new HttpError(400, 'only one of receiver_username or receiver_email can be provided'));

    debug(`create: ${filePath} receiver:${receiverUsername || receiverEmail}`);

    let shareId;
    try {
        shareId = await shares.create({ user: req.user, filePath, receiverUsername, receiverEmail, readonly });
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, { shareId }));
}
