'use strict';

exports = module.exports = {
    list,
    get,
    create
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:shares'),
    files = require('./files.js'),
    database = require('./database.js'),
    crypto = require('crypto'),
    util = require('util'),
    exec = util.promisify(require('child_process').exec),
    mime = require('./mime.js'),
    MainError = require('./mainerror.js');

function postProcess(data) {
    data.userId = data.user_id;
    delete data.user_id;

    data.filePath = data.file_path;
    delete data.file_path;

    return data;
}

async function list(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`list: ${username}`);

    return [];
}

async function create(user, filePath) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof filePath, 'string');

    debug(`create: ${user.username} ${filePath}`);

    const fullFilePath = files.getValidFullPath(user.username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const shareId = 'sid-' + crypto.randomBytes(32).toString('hex');

    try {
        await database.query('INSERT INTO shares (id, user_id, file_path) VALUES ($1, $2, $3)', [ shareId, user.id, filePath ]);
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
