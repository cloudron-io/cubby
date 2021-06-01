'use strict';

exports = module.exports = {
    WebdavUserManager,

    login,
    tokenAuth,
    profile,
    list
};

var assert = require('assert'),
    users = require('../users.js'),
    tokens = require('../tokens.js'),
    MainError = require('../mainerror.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess,
    webdavErrors = require('webdav-server').v2.Errors;

async function login(req, res, next) {
    assert.strictEqual(typeof req.body, 'object');

    if (!req.body.username && typeof req.body.username !== 'string') return next(new HttpError(400, 'username must be string'));
    if (!req.body.password && typeof req.body.password !== 'string') return next(new HttpError(400, 'password must be string'));

    const user = await users.login(req.body.username, req.body.password);
    if (!user) return next(new HttpError(403, 'invalid username or password'));

    const accessToken = await tokens.add(user.username);

    next(new HttpSuccess(200, { user, accessToken }));
}

async function tokenAuth(req, res, next) {
    var accessToken = req.query.access_token || req.body.accessToken;

    try {
        req.user = await users.getByAccessToken(accessToken);
        if (!req.user) return next(new HttpError(401, 'Invalid Access Token'));
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next();
}

async function profile(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    // TODO remove private fields
    next(new HttpSuccess(200, req.user));
}

async function list(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    try {
        const result = await users.list();
        return next(new HttpSuccess(200, { users: result }));
    } catch (error) {
        return next(new HttpError(500, error));
    }
}

// This implements the required interface only for the Basic Authentication for webdav-server
function WebdavUserManager() {
    this._authCache = {
        // key: TimeToDie as ms
    };
}

WebdavUserManager.prototype.getDefaultUser = function (callback) {
    // this is only a dummy user, since we always require authentication
    var user = {
        username: 'DefaultUser',
        password: null,
        isAdministrator: false,
        isDefaultUser: true,
        uid: 'DefaultUser'
    };

    callback(user);
};

WebdavUserManager.prototype.getUserByNamePassword = async function (username, password, callback) {
    const cacheKey = 'key-'+username+password;

    if (this._authCache[cacheKey] && this._authCache[cacheKey].expiresAt > Date.now()) {
        return callback(null, this._authCache[cacheKey].user);
    } else {
        delete this._authCache[cacheKey];
    }

    const user = await users.login(username, password);
    if (!user) return callback(webdavErrors.UserNotFound);

    this._authCache[cacheKey] = { user: user, expiresAt: Date.now() + (60 * 1000) }; // cache for up to 1 min

    callback(null, user);
};
