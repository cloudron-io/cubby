'use strict';

exports = module.exports = {
    list,
    get,
    create
};

var assert = require('assert'),
    debug = require('debug')('cubby:shares'),
    files = require('./files.js'),
    database = require('./database.js'),
    crypto = require('crypto'),
    MainError = require('./mainerror.js');

function postProcess(data) {
    data.owner = data.owner;
    delete data.owner;

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

    let result;
    try {
        result = await database.query('SELECT * FROM shares WHERE receiver_username = $1', [ username ]);
    } catch (error) {
        throw new MainError(MainError.DATABASE_ERROR, error);
    }

    result.rows.forEach(postProcess);

    return result.rows;
}

async function create({ user, filePath, receiverUsername, receiverEmail, readonly, expiresAt = 0 }) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof filePath, 'string');
    assert(typeof receiverUsername === 'string' || !receiverUsername);
    assert(typeof receiverEmail === 'string' || !receiverEmail);
    assert((receiverUsername && !receiverEmail) || (!receiverUsername && receiverEmail));
    assert(typeof readonly === 'undefined' || typeof readonly === 'boolean');

    // ensure we have a bool with false as fallback
    readonly = !!readonly;

    debug(`create: ${user.username} ${filePath} receiver:${receiverUsername || receiverEmail} readonly:${readonly} expiresAt:${expiresAt}`);

    const fullFilePath = files.getValidFullPath(user.username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const shareId = 'sid-' + crypto.randomBytes(32).toString('hex');

    try {
        await database.query('INSERT INTO shares (id, owner, file_path, receiver_email, receiver_username, readonly, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
            shareId, user.username, filePath, receiverEmail || null, receiverUsername || null, readonly, expiresAt || null
        ]);
    } catch (error) {
        throw new MainError(MainError.DATABASE_ERROR, error);
    }

    return shareId;
}

async function get(shareId) {
    assert.strictEqual(typeof shareId, 'string');

    debug(`get: ${shareId}`);

    let result;
    try {
        result = await database.query('SELECT * FROM shares WHERE id = $1', [ shareId ]);
    } catch (error) {
        throw new MainError(MainError.DATABASE_ERROR, error);
    }

    if (result.rows.length === 0) return null;

    return postProcess(result.rows[0]);
}
