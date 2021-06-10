'use strict';

exports = module.exports = {
    getByUsername,
    getByUsernameAndDirectory,
    calculate
};

var assert = require('assert'),
    async = require('async'),
    debug = require('debug')('cubby:diskusage'),
    execSync = require('child_process').execSync,
    constants = require('./constants.js'),
    users = require('./users.js'),
    path = require('path'),
    df = require('@sindresorhus/df'),
    MainError = require('./mainerror.js');

// { username: { used: int, directories: { filepath: size }}
const gCache = {};

async function getByUsername(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`getByUsername: username:${username}`);

    if (!gCache[username]) await calculateByUsername(username);

    // TODO use the quota if any set
    const result = await df.file(constants.DATA_ROOT);

    return {
        used: gCache[username].used,
        available: result.available,
        size: result.size,
    };
}

async function getByUsernameAndDirectory(username, filepath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filepath, 'string');

    debug(`getByUsernameAndDirectory: username:${username} directory:${filepath}`);

    if (!gCache[username]) await calculateByUsername(username);

    return gCache[username].directories[filepath] || 0;
}

async function calculateByUsername(username) {
    assert.strictEqual(typeof username, 'string');

    debug(`calculateByUsername: username:${username}`);

    gCache[username] = {
        used: 0,
        directories: {}
    };

    try {
        const out = execSync(`du -b ${path.join(constants.DATA_ROOT, username)}`, { encoding: 'utf8' });
        out.split('\n').filter(function (l) { return !!l; }).forEach(function (l) {
            const parts = l.split('\t');
            if (parts.length !== 2) return;

            // we treat the empty folder size as 0 for display purpose
            const size = parseInt(parts[0]) === 4096 ? 0 : parseInt(parts[0]);
            const filepath = parts[1].slice(path.join(constants.DATA_ROOT, username).length);

            if (filepath === '') gCache[username].used = size;
            else gCache[username].directories[filepath] = size;
        });
    } catch (error) {
        console.error(`Failed to calculate usage for ${username}. Falling back to 0.`, error);
    }
}

async function calculate() {
    debug(`calculate`);

    const userList = await users.list();

    await async.eachSeries(userList, async function (user) {
        await calculateByUsername(user.username);
    });
}
