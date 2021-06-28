'use strict';

exports = module.exports = {
    login,
    sync
};

var assert = require('assert'),
    async = require('async'),
    ldapjs = require('ldapjs'),
    once = require('once'),
    debug = require('debug')('cubby:ldap'),
    promisify = require('util').promisify,
    callbackify = require('util').callbackify,
    constants = require('./constants.js'),
    users = require('./users.js'),
    MainError = require('./mainerror.js');

const LDAP_URL = process.env.CLOUDRON_LDAP_URL;
const LDAP_USERS_BASE_DN = process.env.CLOUDRON_LDAP_USERS_BASE_DN;
const LDAP_BIND_DN = process.env.CLOUDRON_LDAP_BIND_DN;
const LDAP_BIND_PASSWORD = process.env.CLOUDRON_LDAP_BIND_PASSWORD;

// https://tools.ietf.org/search/rfc4515#section-3
function sanitizeInput(username) {
    return username
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\\/g, '\\5c')
        .replace(/\0/g, '\\00')
        .replace(/\//g, '\\2f');
}

async function login(username, password) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof password, 'string');

    if (!LDAP_URL) return false;
    if (username === '' || password === '') return false;

    debug(`login attempt for ${username}`);

    var ldapClient = ldapjs.createClient({ url: LDAP_URL });
    ldapClient.on('error', function (error) {
        console.error('LDAP error', error);
    });

    function searchAndBind(callback) {
        ldapClient.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, function (error) {
            if (error) return callback(new MainError(MainError.LDAP_ERROR, error));

            username = sanitizeInput(username);

            var filter = `(|(uid=${username})(mail=${username})(username=${username})(sAMAccountName=${username}))`;
            ldapClient.search(LDAP_USERS_BASE_DN, { filter: filter }, function (error, result) {
                if (error) return callback(new MainError(MainError.LDAP_ERROR, error));

                var items = [];

                result.on('searchEntry', function(entry) { items.push(entry.object); });
                result.on('error', function (error) { callback(new MainError(MainError.LDAP_ERROR, error)); });
                result.on('end', function (result) {
                    if (result.status !== 0 || items.length === 0) return callback(new MainError(MainError.ACCESS_DENIED));

                    // pick the first found
                    var user = items[0];

                    debug(`found user ${user.username}`);

                    ldapClient.bind(user.dn, password, function (error) {
                        if (error) return callback(new MainError(MainError.ACCESS_DENIED));

                        callback(null);
                    });
                });
            });
        });
    }

    try {
        await promisify(searchAndBind)();
        return true;
    } catch (error) {
        return false;
    }
}

async function sync(callback) {
    callback = callback || function (error) { console.error('ldap sync failed:', error); };

    if (!LDAP_URL) return callback();

    debug('sync');

    callback = once(callback);

    var ldapClient = ldapjs.createClient({ url: LDAP_URL });
    ldapClient.on('error', callback);

    ldapClient.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, function (error) {
        if (error) return callback(error);

        ldapClient.search(LDAP_USERS_BASE_DN, {}, function (error, result) {
            if (error) return callback(error);

            var items = [];

            result.on('searchEntry', function(entry) { items.push(entry.object); });
            result.on('error', callback);
            result.on('end', function (result) {
                if (result.status !== 0) return callback(error);

                debug('found users:' + items.map(function (u) { return u.username; }).join(', '));

                async.each(items, function (user, callback) {
                    const addUser = callbackify(users.add);
                    const updateUser = callbackify(users.update);

                    addUser({ username: user.username, email: user.mail, displayName: user.displayname }, constants.USER_SOURCE_LDAP, function (error) {
                        if (error && error.reason === MainError.ALREADY_EXISTS) {
                            debug(`update user ${user.username} ${user.mail} ${user.displayname}`);
                            return updateUser(user.username, { email: user.mail, displayName: user.displayname }, callback);
                        } else if (error) {
                            console.error(`Failed to add user ${user.username}`, error);
                        } else {
                            debug(`user ${user.username} added`);
                        }

                        callback(null);
                    });
                }, callback);
            });
        });
    });
}
