'use strict';

exports = module.exports = {
    login,
    add,
    get,
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

    const user = await get(username);
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

    const user = await get(username);
    if (!user) return null;

    if (user.source === constants.USER_SOURCE_LOCAL) {
        if (await localLogin(username, password)) return user;
        else return null;
    } else {
        debug(`login: ${username} has invalid source type ${user.source}.`);
        return null;
    }
}

async function add(user, source) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof source, 'string');

    if (source !== constants.USER_SOURCE_OIDC && source !== constants.USER_SOURCE_LOCAL) throw new MainError(MainError.BAD_FIELD, `source must be "${constants.USER_SOURCE_LOCAL}" or "${constants.USER_SOURCE_OIDC}"`);

    const username = user.username;
    const email = user.email;
    const displayName = user.displayName;
    let password = '';
    let salt = '';

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
        const result = await database.query('INSERT INTO users (username, email, display_name, source, password, salt) VALUES ($1, $2, $3, $4, $5, $6)', [ username, email, displayName, source, password, salt ]);
        if (result.rowCount !== 1) throw new MainError(MainError.DATABASE_ERROR, 'failed to insert');
    } catch (error) {
        if (error.nestedError && error.nestedError.detail && error.nestedError.detail.indexOf('already exists') !== -1 && error.nestedError.detail.indexOf('email') !== -1) throw new MainError(MainError.ALREADY_EXISTS, 'email already exists');
        if (error.nestedError && error.nestedError.detail && error.nestedError.detail.indexOf('already exists') !== -1 && error.nestedError.detail.indexOf('username') !== -1) throw new MainError(MainError.ALREADY_EXISTS, 'username already exists');

        throw error;
    }
}

async function get(username) {
    assert.strictEqual(typeof username, 'string');

    const result = await database.query('SELECT * FROM users WHERE username = $1', [ username ]);
    if (result.rows.length === 0) throw new MainError(MainError.NOT_FOUND, 'user not found');

    return postProcess(result.rows[0]);
}

async function getByAccessToken(accessToken) {
    assert.strictEqual(typeof accessToken, 'string');

    const token = await tokens.get(accessToken);
    if (!token) return null;

    return await get(token.username);
}

async function list() {
    const users = await database.query('SELECT * FROM users');

    users.rows.forEach(postProcess);

    return users.rows;
}

async function update(username, user) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof user, 'object');

    await database.query('UPDATE users SET email = $1, display_name = $2 WHERE username = $3', [ user.email, user.displayName, username ]);
}

async function remove(username) {
    assert.strictEqual(typeof username, 'string');

    await database.query('DELETE FROM users WHERE username = $1', [ username ]);
}
