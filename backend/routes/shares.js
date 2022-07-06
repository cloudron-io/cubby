'use strict';

exports = module.exports = {
    attachOwner,
    attachReceiver,
    optionalAttachReceiver,
    listShares,
    createShare,
    removeShare,
    add,
    get,
    head,
    update,
    remove
};

var assert = require('assert'),
    async = require('async'),
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

    const filePath = decodeURIComponent(req.query.path);
    const receiverUsername = req.query.receiver_username || null;
    const receiverEmail = req.query.receiver_email || null;
    const readonly = boolLike(req.query.readonly);
    const expiresAt = req.query.expires_at ? parseInt(req.query.expires_at) : 0;

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
        await async.each(result, async function (share) {
            let file = await files.get(share.owner, share.filePath);

            file.share = share;
            file = file.asShare(share.filePath);

            sharedFiles.push(file);
        });
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
        owner: req.user.username,
        mimeType: 'inode/share',
        files: sharedFiles
    });

    next(new HttpSuccess(200, entry.withoutPrivate()));
}

async function removeShare(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const shareId = req.query.share_id;

    if (!shareId) return next(new HttpError(400, 'share_id must be a non-empty string'));

    debug(`removeShare: ${shareId}`);

    try {
        await shares.remove(shareId);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

async function add(req, res, next) {
    assert.strictEqual(typeof req.share, 'object');

    const filePath = req.query.path || '';
    const directory = boolLike(req.query.directory);
    const overwrite = boolLike(req.query.overwrite);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (!(req.files && req.files.file) && !directory) return next(new HttpError(400, 'missing file or directory'));
    if ((req.files && req.files.file) && directory) return next(new HttpError(400, 'either file or directory'));

    const mtime = req.fields && req.fields.mtime ? new Date(req.fields.mtime) : null;

    debug(`add: ${req.share.id} path:${filePath} mtime:${mtime}`);

    try {
        if (directory) await files.addDirectory(req.share.owner, path.join(req.share.filePath, filePath));
        else await files.addOrOverwriteFile(req.share.owner, path.join(req.share.filePath, filePath), req.files.file.path, mtime, overwrite);
    } catch (error) {
        if (error.reason === MainError.ALREADY_EXISTS) return next(new HttpError(409, 'already exists'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

async function get(req, res, next) {
    assert.strictEqual(typeof req.share, 'object');

    const filePath = req.query.path || '';//? decodeURIComponent(req.query.path) : '';
    const type = req.query.type;

    if (type && (type !== 'raw' && type !== 'download')) return next(new HttpError(400, 'type must be either empty, "download" or "raw"'));

    debug(`get: ${req.share.id} path:${filePath} type:${type || 'json'}`);

    let file;
    try {
        file = await files.get(req.share.owner, path.join(req.share.filePath, filePath));
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'file not found'));
        return next(new HttpError(500, error));
    }

    if (type === 'raw') {
        if (file.isDirectory) return res.redirect(`/share.html?shareId=${req.share.id}#/`);
        return res.sendFile(file._fullFilePath);
    } else if (type === 'download') {
        if (file.isDirectory) return next(new HttpError(417, 'type "download" is not supported for directories'));
        return res.download(file._fullFilePath);
    }

    // for now we only allow raw or download on publicly shared links
    // if (!req.user) return next(new HttpError(403, 'not allowed'));

    // those files are always part of this share
    file.files.forEach(function (f) { f.share = req.share; });
    file.share = req.share;

    next(new HttpSuccess(200, file.asShare(req.share.filePath).withoutPrivate()));
}

async function head(req, res, next) {
    assert.strictEqual(typeof req.share, 'object');

    const filePath = req.query.path || '';//? decodeURIComponent(req.query.path) : '';

    debug(`head: ${req.share.id} path:${filePath}`);

    let result;
    try {
        result = await files.head(req.share.owner, path.join(req.share.filePath, filePath));
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'file not found'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, result));
}

async function update(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');
    assert.strictEqual(typeof req.share, 'object');

    const filePath = req.query.path;
    const action = req.query.action;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug(`update: [${action}] ${req.share.id} ${filePath}`);

    if (action === 'move') {
        const newFilePath = decodeURIComponent(req.query.new_path);
        if (!newFilePath) return next(new HttpError(400, 'move action requires new_path argument'));

        try {
            await files.move(req.share.owner, path.join(req.share.filePath, filePath), path.join(req.share.filePath, newFilePath));
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
    assert.strictEqual(typeof req.share, 'object');

    const filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug(`remove: ${req.share.id} path=${filePath}`);

    try {
        await files.remove(req.share.owner, path.join(req.share.filePath, filePath));
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}
