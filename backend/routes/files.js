'use strict';

exports = module.exports = {
    add,
    head,
    get,
    update,
    remove,
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:files'),
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

async function add(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const directory = boolLike(req.query.directory);
    const overwrite = boolLike(req.query.overwrite);
    let filePath = req.query.path ? decodeURIComponent(req.query.path) : '';

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (!(req.files && req.files.file) && !directory) return next(new HttpError(400, 'missing file or directory'));
    if ((req.files && req.files.file) && directory) return next(new HttpError(400, 'either file or directory'));

    var mtime = req.fields && req.fields.mtime ? new Date(req.fields.mtime) : null;

    let resource = filePath.split('/')[1];
    filePath = filePath.slice(resource.length+1);

    debug(`add: ${resource} ${filePath} ${mtime}`);

    // FIXME currently we still operate on username only
    resource = req.user.username;

    try {
        if (directory) await files.addDirectory(resource, filePath);
        else await files.addOrOverwriteFile(resource, filePath, req.files.file.path, mtime, overwrite);
    } catch (error) {
        if (error.reason === MainError.ALREADY_EXISTS) return next(new HttpError(409, 'already exists'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

async function head(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const filePath = req.query.path ? decodeURIComponent(req.query.path) : '';

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug(`head: ${filePath}`);

    let result;

    try {
        result = await files.head(req.user.username, filePath);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, result));
}

async function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const type = req.query.type;
    let filePath;
    try {
        filePath = req.query.path ? decodeURIComponent(req.query.path) : '';
    } catch (e) {
        console.error(e);
    }

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (type && (type !== 'raw' && type !== 'download' && type !== 'json')) return next(new HttpError(400, 'type must be either empty, "download" or "raw"'));

    const resource = filePath.split('/')[1];
    filePath = filePath.slice(resource.length+1);

    debug(`get: ${resource} ${filePath} type:${type || 'json'}`);

    if (resource === 'home') {
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

        next(new HttpSuccess(200, result.withoutPrivate()));
    } else if (resource === 'recent') {
        const daysAgo = isNaN(parseInt(req.query.days_ago, 10)) ? 3 : parseInt(req.query.days_ago, 10);
        const maxFiles = 100;

        debug(`get: recent daysAgo:${daysAgo} maxFiles:${maxFiles}`);

        let result = [];
        try {
            result = await files.recent(req.user.username, daysAgo, maxFiles);
        } catch (error) {
            return next(new HttpError(500, error));
        }

        const entry = new Entry({
            id: 'recent',
            fullFilePath: '/recent',
            fileName: 'Recent',
            filePath: '/',
            owner: req.user.username,
            isDirectory: true,
            isFile: false,
            mimeType: 'inode/recent',
            files: result
        });

        next(new HttpSuccess(200, entry.withoutPrivate()));
    } else {
        next(new HttpError(500, `Unknown resource type ${resource}`));
    }
}

async function update(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const action = req.query.action;
    let filePath = decodeURIComponent(req.query.path);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    let resource = filePath.split('/')[1];
    filePath = filePath.slice(resource.length+1);

    debug(`update: [${action}] ${resource} ${filePath}`);

    // TODO support shares
    if (action === 'move') {
        if (!req.query.new_path) return next(new HttpError(400, 'action requires new_path argument'));

        let newFilePath = decodeURIComponent(req.query.new_path);
        const newResource = newFilePath.split('/')[1];
        newFilePath = newFilePath.slice(newResource.length+1);

        // currently we still operate on username only
        resource = req.user.username;
        try {
            await files.move(resource, filePath, newFilePath);
        } catch (error) {
            if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
            if (error.reason === MainError.CONFLICT) return next(new HttpError(409, 'already exists'));
            return next(new HttpError(500, error));
        }
    } else if (action === 'copy') {
        if (!req.query.new_path) return next(new HttpError(400, 'action requires new_path argument'));

        let newFilePath = decodeURIComponent(req.query.new_path);
        const newResource = newFilePath.split('/')[1];
        // currently we still operate on username only
        newFilePath = newFilePath.slice(newResource.length+1);

        // FIXME currently we still operate on username only
        resource = req.user.username;
        try {
            await files.copy(resource, filePath, newFilePath);
        } catch (error) {
            if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
            if (error.reason === MainError.CONFLICT) return next(new HttpError(409, 'already exists'));
            return next(new HttpError(500, error));
        }
    } else {
        return next(new HttpError(400, 'unknown action. Must be one of "move", "copy"'));
    }

    return next(new HttpSuccess(200, {}));
}

async function remove(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    let filePath = req.query.path ? decodeURIComponent(req.query.path) : '';

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    let resource = filePath.split('/')[1];
    filePath = filePath.slice(resource.length+1);

    debug(`remove: ${resource} ${filePath}`);

    // FIXME currently we still operate on username only
    resource = req.user.username;

    try {
        await files.remove(resource, filePath);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}
