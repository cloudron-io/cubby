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
    data.ownerId = data.owner_id;
    delete data.owner_id;

    data.filePath = data.file_path;
    delete data.file_path;

    data.createdAt = data.created_at;
    delete data.created_at;

    data.expiresAt = data.expires_at;
    delete data.expires_at;

    data.receiverUserId = data.receiver_user_id;
    delete data.receiver_user_id;

    data.receiverEmail = data.receiver_email;
    delete data.receiver_email;

    return data;
}

async function list(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`list: ${username}`);

    return [];
}

async function create({ user, filePath, receiverUserId, receiverEmail, readonly, expiresAt = 0 }) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof filePath, 'string');
    assert(typeof receiverUserId === 'string' || !receiverUserId);
    assert(typeof receiverEmail === 'string' || !receiverEmail);
    assert((receiverUserId && !receiverEmail) || (!receiverUserId && receiverEmail));
    assert(typeof readonly === 'undefined' || typeof readonly === 'boolean');

    // ensure we have a bool with false as fallback
    readonly = !!readonly;

    debug(`create: ${user.username} ${filePath} receiver:${receiverUserId || receiverEmail} readonly:${readonly} expiresAt:${expiresAt}`);

    const fullFilePath = files.getValidFullPath(user.username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const shareId = 'sid-' + crypto.randomBytes(32).toString('hex');

    try {
        await database.query('INSERT INTO shares (id, owner_id, file_path, receiver_email, receiver_user_id, readonly, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
            shareId, user.id, filePath, receiverEmail || null, receiverUserId || null, readonly, expiresAt || null
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
