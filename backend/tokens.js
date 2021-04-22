'use strict';

exports = module.exports = {
    add,
    get,
    remove
};

var assert = require('assert'),
    crypto = require('crypto'),
    debug = require('debug')('cubby:tokens'),
    database = require('./database.js'),
    MainError = require('./mainerror.js');

function add(userId, callback) {
    assert.strictEqual(typeof userId, 'string');
    assert.strictEqual(typeof callback, 'function');

    var token = crypto.randomBytes(32).toString('hex');

    database.query('INSERT INTO tokens (id, userId) VALUES (?, ?)', [ token, userId ], function (error, result) {
        if (error || result.affectedRows !== 1) return callback(new MainError(MainError.DATABASE_ERROR, error));

        callback(null, token);
    });
}

function get(token, callback) {
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(typeof callback, 'function');

    database.query('SELECT * FROM tokens WHERE id = ?', [ token ], function (error, result) {
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));
        if (result.length === 0) return callback(new MainError(MainError.NOT_FOUND));

        callback(null, result[0]);
    });
}

function remove(token, callback) {
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(typeof callback, 'function');

    database.query('DELETE FROM tokens WHERE id = ?', [ token ], function (error) {
        if (error) return callback(new MainError(MainError.DATABASE_ERROR, error));
        callback(null);
    });
}
