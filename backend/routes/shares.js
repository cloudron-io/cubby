'use strict';

exports = module.exports = {
    attachOwner,
    attachReceiver,
    optionalAttachReceiver,
    listShares,
    createShare,
    removeShare
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:shares'),
    shares = require('../shares.js'),
    files = require('../files.js'),
    Entry = require('../entry.js'),
    util = require('util'),
    path = require('path'),
    MainError = require('../mainerror.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

function boolLike(arg) {
    if (!arg) return false;
    if (util.isNumber(arg)) return !!arg;
    if (util.isString(arg) && arg.toLowerCase() === 'false') return false;

    return true;
}

// just handles the :shareId param and adds req.share if valid
async function attachOwner(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
    assert.strictEqual(typeof req.params.shareId, 'string');

    const shareId = req.params.shareId;

    debug(`attach: ${shareId}`);

    try {
        req.share = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'share not found'));
        return next(new HttpError(500, error));
    }

    if (req.user && req.share.owner !== req.user.username) return next(new HttpError(403, 'not allowed'));

    next();
}

async function attachReceiver(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
    assert.strictEqual(typeof req.params.shareId, 'string');

    const shareId = req.params.shareId;

    debug(`attach: ${shareId}`);

    try {
        req.share = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'share not found'));
        return next(new HttpError(500, error));
    }

    if (req.user && req.share.receiverUsername && req.share.receiverUsername !== req.user.username) return next(new HttpError(403, 'not allowed'));

    next();
}

async function optionalAttachReceiver(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
    assert.strictEqual(typeof req.params.id, 'string');
    assert.strictEqual(typeof req.params.type, 'string');

    if (req.params.type !== 'shares') return next();

    const shareId = req.params.id;

    debug(`attach: ${shareId}`);

    try {
        req.share = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'share not found'));
        return next(new HttpError(500, error));
    }

    if (req.user && req.share.receiverUsername && req.share.receiverUsername !== req.user.username) return next(new HttpError(403, 'not allowed'));

    next();
}

// If a share for the receiver and filepath already exists, just reuse that
async function createShare(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const filePath = req.body.path;
    const receiverUsername = req.body.receiverUsername || null;
    const receiverEmail = req.body.receiverEmail || null;
    const readonly = boolLike(req.body.readonly);
    const expiresAt = req.body.expiresAt ? parseInt(req.body.expiresAt) : 0;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug(`createShare: ${filePath} receiver:${receiverUsername || receiverEmail || 'link'}`);

    let existingShares;

    if (receiverEmail || receiverUsername) {
        try {
            existingShares = await shares.getByReceiverAndFilepath(receiverUsername || receiverEmail, filePath, true /* exact match */);
        } catch (error) {
            return next(new HttpError(500, error));
        }

        if (existingShares && existingShares.length) {
            debug(`create: share already exists. Reusing ${existingShares[0].id}`);
            return next(new HttpSuccess(200, { shareId: existingShares[0].id }));
        }
    }

    let shareId;
    try {
        shareId = await shares.create({ user: req.user, filePath, receiverUsername, receiverEmail, readonly, expiresAt });
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, { shareId }));
}

async function listShares(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    debug('listShares');

    let result = [];

    try {
        result = await shares.list(req.user.username);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    // Collect all file entries from shares
    let sharedFiles = [];
    try {
        for (let share of result) {
            let file = await files.get(share.owner, share.filePath);

            file.isShare = true;
            file.share = share;
            file = file.asShare(share.filePath);

            sharedFiles.push(file);
        }
    } catch (error) {
        return next(new HttpError(500, error));
    }

    const entry = new Entry({
        id: 'shares',
        fullFilePath: '/shares',
        fileName: 'Shares',
        filePath: '/',
        isDirectory: true,
        isFile: false,
        isShare: true,
        owner: req.user.username,
        mimeType: 'inode/share',
        files: sharedFiles
    });

    next(new HttpSuccess(200, entry.withoutPrivate()));
}

async function removeShare(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const shareId = req.query.shareId;

    if (!shareId) return next(new HttpError(400, 'share_id must be a non-empty string'));

    debug(`removeShare: ${shareId}`);

    try {
        await shares.remove(shareId);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}
