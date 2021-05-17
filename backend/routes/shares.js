'use strict';

exports = module.exports = {
    list,
    get,
    create
};

var assert = require('assert'),
    async = require('async'),
    debug = require('debug')('cubby:routes:shares'),
    shares = require('../shares.js'),
    files = require('../files.js'),
    Entry = require('../entry.js'),
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

    debug('get');

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

            file.shares = [ share ];

            sharedFiles.push(file);
        });
    } catch (error) {
        return next(new HttpError(500, error));
    }

    const entry = new Entry({
        fullFilePath: '/shares',
        fileName: 'Shares',
        filePath: '/',
        isDirectory: true,
        isFile: false,
        owner: req.user.username,
        mimeType: 'inode/share',
        files: sharedFiles
    });

    next(new HttpSuccess(200, entry.withoutPrivate(req.user.username)));
}

async function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
    assert.strictEqual(typeof req.params.shareId, 'string');

    const filePath = req.query.path ? decodeURIComponent(req.query.path) : '';
    const type = req.query.type;
    const shareId = req.params.shareId;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    if (type && (type !== 'raw' && type !== 'download')) return next(new HttpError(400, 'type must be either empty, "download" or "raw"'));

    debug(`get: ${shareId} path:${filePath} type:${type || 'json'}`);

    let share;
    try {
        share = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'share not found'));
        return next(new HttpError(500, error));
    }

    if (share.receiverUsername !== req.user.username) return next(new HttpError(403, 'not allowed'));
    if (filePath.indexOf(share.filePath) !== 0) return next(new HttpError(403, 'not allowed'));

    let file;
    try {
        file = await files.get(share.owner, filePath);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'file not found'));
        return next(new HttpError(500, error));
    }

    if (type === 'raw') {
        if (file.isDirectory) return next(new HttpError(417, 'type "raw" is not supported for directories'));
        return res.sendFile(file._fullFilePath);
    } else if (type === 'download') {
        if (file.isDirectory) return next(new HttpError(417, 'type "download" is not supported for directories'));
        return res.download(file._fullFilePath);
    }

    next(new HttpSuccess(200, file.withoutPrivate(req.user.username)));
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
