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


function localLogin(username, password, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof password, 'string');
    assert.strictEqual(typeof callback, 'function');

    getByUsername(username, function (error, user) {
        if (error && error.reason === MainError.NOT_FOUND) return callback(new MainError(MainError.ACCESS_DENIED));
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));

        var saltBinary = Buffer.from(user.salt, 'hex');
        crypto.pbkdf2(password, saltBinary, CRYPTO_ITERATIONS, CRYPTO_KEY_LENGTH, CRYPTO_DIGEST, function (error, derivedKey) {
            if (error) return callback(new MainError(MainError.CRYPTO_ERROR, error));

            var derivedKeyHex = Buffer.from(derivedKey, 'binary').toString('hex');
            if (derivedKeyHex !== user.password) return callback(new MainError(MainError.ACCESS_DENIED));

            callback(null);
        });
    });
}

function login(username, password, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof password, 'string');
    assert.strictEqual(typeof callback, 'function');

    if (username === '' || password === '') return callback(new MainError(MainError.ACCESS_DENIED));

    debug('login: ', username);

    getByUsername(username, function (error, user) {
        if (error && error.reason === MainError.NOT_FOUND) return callback(new MainError(MainError.ACCESS_DENIED));
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));

        function done(error) {
            if (error) return callback(error);

            callback(null, user);
        }

        debug('login: found user', user);

        if (user.source === constants.USER_SOURCE_LOCAL) localLogin(username, password, done);
        else if (user.source === constants.USER_SOURCE_LDAP) ldap.login(username, password, done);
        else done(new MainError(MainError.BAD_STATE));

    });
}

function add(user, source, callback) {
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof source, 'string');
    assert.strictEqual(typeof callback, 'function');

    if (source !== constants.USER_SOURCE_LDAP && source !== constants.USER_SOURCE_LOCAL) return callback(new MainError(MainError.BAD_FIELD, `source must be "${constants.USER_SOURCE_LOCAL}" or "${constants.USER_SOURCE_LDAP}"`));

    var userId = 'uid-' + crypto.randomBytes(32).toString('hex');
    var username = user.username;
    var email = user.email;
    var displayName = user.displayName;
    var password = '';
    var salt = '';

    function hashPasswordIfNeeded(callback) {
        if (source !== constants.USER_SOURCE_LOCAL) return callback();

        crypto.randomBytes(CRYPTO_SALT_SIZE, function (error, rawSalt) {
            if (error) return callback(new MainError(MainError.CRYPTO_ERROR, error));

            crypto.pbkdf2(user.password, rawSalt, CRYPTO_ITERATIONS, CRYPTO_KEY_LENGTH, CRYPTO_DIGEST, function (error, derivedKey) {
                if (error) return callback(new MainError(MainError.CRYPTO_ERROR, error));

                salt = rawSalt.toString('hex');
                password = Buffer.from(derivedKey, 'binary').toString('hex');

                callback();
            });
        });
    }

    hashPasswordIfNeeded(function (error) {
        if (error) return callback(error);

        database.query('INSERT INTO users (id, username, email, displayName, source, password, salt) VALUES ($1, $2, $3, $4, $5, $6, $7)', [ userId, username, email, displayName, source, password, salt ], function (error, result) {
            if (error && error.detail.indexOf('already exists') !== -1 && error.detail.indexOf('email') !== -1) return callback(new MainError(MainError.ALREADY_EXISTS, 'email already exists'));
            if (error && error.detail.indexOf('already exists') !== -1 && error.detail.indexOf('username') !== -1) return callback(new MainError(MainError.ALREADY_EXISTS, 'username already exists'));
            if (error || result.rowCount !== 1) return callback(new MainError(MainError.DATABASE_ERROR, error));

            callback(null);
        });
    });
}

function get(userId, callback) {
    assert.strictEqual(typeof userId, 'string');
    assert.strictEqual(typeof callback, 'function');

    database.query('SELECT * FROM users WHERE id = $1', [ userId ], function (error, result) {
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));
        if (result.rows.length === 0) return callback(new MainError(MainError.NOT_FOUND));

        callback(null, result[0]);
    });
}

function getByUsername(username, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof callback, 'function');

    database.query('SELECT * FROM users WHERE username = $1', [ username ], function (error, result) {
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));
        if (result.rows.length === 0) return callback(new MainError(MainError.NOT_FOUND));

        callback(null, result.rows[0]);
    });
}

function getByAccessToken(accessToken, callback) {
    assert.strictEqual(typeof accessToken, 'string');
    assert.strictEqual(typeof callback, 'function');

    tokens.get(accessToken, function (error, result) {
        if (error) return callback(error);

        get(result.userId, callback);
    });
}

function list(callback) {
    assert.strictEqual(typeof callback, 'function');
}

function update(userId, user, callback) {
    assert.strictEqual(typeof userId, 'string');
    assert.strictEqual(typeof user, 'object');
    assert.strictEqual(typeof callback, 'function');
}

function remove(userId, callback) {
    assert.strictEqual(typeof userId, 'string');
    assert.strictEqual(typeof callback, 'function');

    database.query('DELETE FROM users WHERE id = $1', [ userId ], function (error) {
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));
        callback(null);
    });
}
