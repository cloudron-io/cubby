'use strict';

exports = module.exports = {
    get
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:preview'),
    preview = require('../preview.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

async function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const type = req.params.type;
    const id = req.params.id; // id depends on type (either username or shareId)
    const hash = req.params.hash;

    debug(`get: type=${type} id=${id} hash=${hash}`);

    if (type === 'files') {
        if (!req.user || id !== req.user.username) return next(new HttpError(404, 'not found')); // do not leak if username or hash should exist

        const localPreviewPath = preview.getLocalPath(hash);
        if (localPreviewPath) return res.sendFile(localPreviewPath);

        return next(new HttpError(412, 'try again later'));
    } else if (type === 'shares') {
       // TODO handle share previews with permission check based on req.user and shareId
    }

    next(new HttpError(404, 'not found'));
}
