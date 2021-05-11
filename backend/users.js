'use strict';

exports = module.exports = {
    login,
    add,
    get,
    getByUsername,
    getByAccessToken,
    list,
    update,
    remove
};

var assert = require('assert'),
    constants = require('./constants.js'),
    crypto = require('crypto'),
    debug = require('debug')('cubby:users'),
    database = require('./database.js'),
    ldap = require('./ldap.js'),
    tokens = require('./tokens.js'),
    MainError = require('./mainerror.js');

var CRYPTO_SALT_SIZE = 64; // 512-bit salt
var CRYPTO_ITERATIONS = 10000; // iterations
var CRYPTO_KEY_LENGTH = 512; // bits
var CRYPTO_DIGEST = 'sha1'; // used to be the default in node 4.1.1 cannot change since it will affect existing db records

function postProcess(data) {
    data.displayName = data.display_name;
    delete data.display_name;

    return data;
}

async function localLogin(username, password) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof password, 'string');

    const user = await getByUsername(username);
    const saltBinary = Buffer.from(user.salt, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, saltBinary, CRYPTO_ITERATIONS, CRYPTO_KEY_LENGTH, CRYPTO_DIGEST);
    const derivedKeyHex = Buffer.from(derivedKey, 'binary').toString('hex');

    return derivedKeyHex === user.password;
}

async function login(username, password) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof password, 'string');

    if (username === '' || password === '') return null;

    debug('login: ', username);

    const user = await getByUsername(username);
    if (!user) return null;

    if (user.source === constants.USER_SOURCE_LOCAL && await localLogin(username, password)) return user;
    else if (user.source === constants.USER_SOURCE_LDAP && await ldap.login(username, password)) return user;
    else throw new MainError(MainError.BAD_STATE);

    return null;
}

async function add(user, source) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof source, 'string');

    if (source !== constants.USER_SOURCE_LDAP && source !== constants.USER_SOURCE_LOCAL) throw new MainError(MainError.BAD_FIELD, `source must be "${constants.USER_SOURCE_LOCAL}" or "${constants.USER_SOURCE_LDAP}"`);

    var userId = 'uid-' + crypto.randomBytes(32).toString('hex');
    var username = user.username;
    var email = user.email;
    var displayName = user.displayName;
    var password = '';
    var salt = '';

    if (source === constants.USER_SOURCE_LOCAL) {
        try {
            const rawSalt = crypto.randomBytes(CRYPTO_SALT_SIZE);
            const derivedKey = crypto.pbkdf2Sync(user.password, rawSalt, CRYPTO_ITERATIONS, CRYPTO_KEY_LENGTH, CRYPTO_DIGEST);

            salt = rawSalt.toString('hex');
            password = Buffer.from(derivedKey, 'binary').toString('hex');
        } catch (error) {
            throw new MainError(MainError.CRYPTO_ERROR, error);
        }
    }

    try {
        const result = await database.query('INSERT INTO users (id, username, email, display_name, source, password, salt) VALUES ($1, $2, $3, $4, $5, $6, $7)', [ userId, username, email, displayName, source, password, salt ]);
        if (result.rowCount !== 1) throw new MainError(MainError.DATABASE_ERROR, 'failed to insert');
    } catch (error) {
        if (error.nestedError && error.nestedError.detail && error.nestedError.detail.indexOf('already exists') !== -1 && error.nestedError.detail.indexOf('email') !== -1) throw new MainError(MainError.ALREADY_EXISTS, 'email already exists');
        if (error.nestedError && error.nestedError.detail && error.nestedError.detail.indexOf('already exists') !== -1 && error.nestedError.detail.indexOf('username') !== -1) throw new MainError(MainError.ALREADY_EXISTS, 'username already exists');

        throw error;
    }
}

async function get(userId) {
    assert.strictEqual(typeof userId, 'string');

    const result = await database.query('SELECT * FROM users WHERE id = $1', [ userId ]);
    if (result.rows.length === 0) return null;

    return postProcess(result.rows[0]);
}

async function getByUsername(username) {
    assert.strictEqual(typeof username, 'string');

    const result = await database.query('SELECT * FROM users WHERE username = $1', [ username ]);
    if (result.rows.length === 0) return null;

    return postProcess(result.rows[0]);
}

async function getByAccessToken(accessToken) {
    assert.strictEqual(typeof accessToken, 'string');

    const token = await tokens.get(accessToken);
    if (!token) return null;

    return await get(token.userId);
}

async function list() {
    const users = await database.query('SELECT * FROM users');

    users.rows.forEach(postProcess);

    return users.rows;
}

async function update(userId, user) {
    assert.strictEqual(typeof userId, 'string');
    assert.strictEqual(typeof user, 'object');
}

async function remove(userId) {
    assert.strictEqual(typeof userId, 'string');

    await database.query('DELETE FROM users WHERE id = $1', [ userId ]);
}
