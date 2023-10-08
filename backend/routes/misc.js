'use strict';

exports = module.exports = {
    getPreview,
    download
};

var assert = require('assert'),
    archiver = require('archiver'),
    debug = require('debug')('cubby:routes:preview'),
    files = require('../files.js'),
    preview = require('../preview.js'),
    HttpError = require('connect-lastmile').HttpError;

async function getPreview(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const type = req.params.type;
    const id = req.params.id; // id depends on type (either username or shareId)
    const hash = req.params.hash;

    debug(`getPreview: type=${type} id=${id} hash=${hash}`);

    if (type === 'files') {
        if (!req.user || id !== req.user.username) return next(new HttpError(404, 'not found')); // do not leak if username or hash should exist

        const localPreviewPath = preview.getLocalPath(hash);
        if (localPreviewPath) return res.sendFile(localPreviewPath);

        return next(new HttpError(412, 'try again later'));
    } else if (type === 'shares') {
        // permissions are checked in routes/shares.js
        if (!req.share) return next(new HttpError(404, 'not found'));

        const localPreviewPath = preview.getLocalPath(hash);
        if (localPreviewPath) return res.sendFile(localPreviewPath);

        return next(new HttpError(412, 'try again later'));
    }

    next(new HttpError(404, 'not found'));
}

async function download(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    let entries;
    try {
        entries = JSON.parse(req.query.entries);
        if (!Array.isArray(entries)) return next(new HttpError(400, 'entries must be a non-empty stringified array'));
    } catch (e) {
        return next(new HttpError(400, 'entries must be a non-empty stringified array'));
    }

    const skipPath = req.query.skipPath || '';
    const name = req.query.name || 'cubby';

    debug(`download: type=zip skipPath=${skipPath}`, entries);

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    archive.on('warning', function (error) {
        debug('download: archiver warning:', error);
    });

    // good practice to catch this error explicitly
    archive.on('error', function (error) {
        console.error('download: archiver error:', error);
        next(new HttpError(500, error));
    });

    res.attachment(`${name}.zip`);
    archive.pipe(res);

    // collect and attach all requested files
    for (const entry of entries) {
        try {
            const resource = entry.resourcePath.split('/')[1];
            let filePath = entry.resourcePath.slice(resource.length+1);

            const file = await files.get(req.user.username /* FIXME should be resource */, filePath);

            debug(`download: add ${entry.isDirectory ? 'directory' : 'file'} to archive: ${file._fullFilePath} as ${file.filePath.slice(skipPath.length)}`);

            if (file.isDirectory) archive.directory(file._fullFilePath, file.filePath.slice(skipPath.length));
            else archive.file(file._fullFilePath, { name: file.filePath.slice(skipPath.length) });
        } catch (error) {
            console.error('download: cannot get entry', entry, error);
        }
    }

    archive.finalize();
}