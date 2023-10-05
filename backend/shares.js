'use strict';

exports = module.exports = {
    list,
    get,
    create,
    getByOwnerAndFilepath,
    getByReceiverAndFilepath,
    remove
};

var assert = require('assert'),
    debug = require('debug')('cubby:shares'),
    files = require('./files.js'),
    database = require('./database.js'),
    crypto = require('crypto'),
    MainError = require('./mainerror.js');

function postProcess(data) {
    data.filePath = data.file_path;
    delete data.file_path;

    data.createdAt = data.created_at;
    delete data.created_at;

    data.expiresAt = data.expires_at;
    delete data.expires_at;

    data.receiverUsername = data.receiver_username;
    delete data.receiver_username;

    data.receiverEmail = data.receiver_email;
    delete data.receiver_email;

    return data;
}

async function list(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`list: ${username}`);

    const result = await database.query('SELECT * FROM shares WHERE receiver_username = $1', [ username ]);

    result.rows.forEach(postProcess);

    // only return non link shares
    return result.rows.filter(function (share) { return share.receiverUsername || share.receiverEmail; });
}

async function create({ user, filePath, receiverUsername, receiverEmail, readonly, expiresAt = 0 }) {
    assert.strictEqual(typeof user, 'object');
    assert(filePath && typeof filePath === 'string');
    assert(typeof receiverUsername === 'string' || !receiverUsername);
    assert(typeof receiverEmail === 'string' || !receiverEmail);
    assert(typeof readonly === 'undefined' || typeof readonly === 'boolean');
    assert.strictEqual(typeof expiresAt, 'number');

    // ensure we have a bool with false as fallback
    readonly = !!readonly;

    debug(`create: ${user.username} ${filePath} receiver:${receiverUsername || receiverEmail || 'link'} readonly:${readonly} expiresAt:${expiresAt}`);

    const fullFilePath = files.getValidFullPath(user.username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const shareId = 'sid-' + crypto.randomBytes(32).toString('hex');

    await database.query('INSERT INTO shares (id, owner, file_path, receiver_email, receiver_username, readonly, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
        shareId, user.username, filePath, receiverEmail || null, receiverUsername || null, readonly, expiresAt || null
    ]);

    return shareId;
}

async function get(shareId) {
    assert.strictEqual(typeof shareId, 'string');

    debug(`get: ${shareId}`);

    const result = await database.query('SELECT * FROM shares WHERE id = $1', [ shareId ]);

    if (result.rows.length === 0) return null;

    return postProcess(result.rows[0]);
}

async function getByOwnerAndFilepath(username, filepath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filepath, 'string');

    debug(`getByOwnerAndFilepath: username:${username} filepath:${filepath}`);

    const result = await database.query('SELECT * FROM shares WHERE owner = $1 AND file_path ~ $2', [ username, `(^)${filepath}(.*$)` ]);

    if (result.rows.length === 0) return null;

    result.rows.forEach(postProcess);

    return result.rows;
}

async function getByReceiverAndFilepath(receiver, filepath, exactMatch = false) {
    assert.strictEqual(typeof receiver, 'string');
    assert.strictEqual(typeof filepath, 'string');
    assert.strictEqual(typeof exactMatch, 'boolean');

    debug(`getByReceiverAndFilepath: receiver:${receiver} exactMatch:${exactMatch} filepath:${filepath}`);

    let result;

    if (exactMatch) result = await database.query('SELECT * FROM shares WHERE (receiver_email = $1 OR receiver_username = $1) AND file_path = $2', [ receiver, filepath ]);
    else result = await database.query('SELECT * FROM shares WHERE (receiver_email = $1 OR receiver_username = $1) AND file_path ~ $2', [ receiver, `(^)${filepath}(.*$)` ]);

    if (result.rows.length === 0) return null;

    result.rows.forEach(postProcess);

    return result.rows;
}

async function remove(shareId) {
    assert.strictEqual(typeof shareId, 'string');

    debug(`remove: ${shareId}`);

    await database.query('DELETE FROM shares WHERE id = $1', [ shareId ]);
}
