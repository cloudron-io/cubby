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

function postProcess(data) {
    return data;
}

async function add(username) {
    assert.strictEqual(typeof username, 'string');

    const token = crypto.randomBytes(32).toString('hex');

    await database.query('INSERT INTO tokens (id, username) VALUES ($1, $2)', [ token, username ]);

    return token;
}

async function get(token) {
    assert.strictEqual(typeof token, 'string');

    const result = await database.query('SELECT * FROM tokens WHERE id = $1', [ token ]);
    if (result.rows.length === 0) return null;

    return postProcess(result.rows[0]);
}

async function remove(token, callback) {
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(typeof callback, 'function');

    await database.query('DELETE FROM tokens WHERE id = $1', [ token ]);
}
