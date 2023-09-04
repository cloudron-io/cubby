'use strict';

exports = module.exports = {
    isAuthenticated,
    login,
    logout,
    tokenAuth,
    sessionAuth,
    optionalSessionAuth,
    optionalTokenAuth,
    profile,
    list
};

var assert = require('assert'),
    users = require('../users.js'),
    tokens = require('../tokens.js'),
    constants = require('../constants.js'),
    diskusage = require('../diskusage.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

async function isAuthenticated(req, res, next) {
    if (!req.oidc.isAuthenticated()) return next(new HttpError(401, 'Unauthorized'));

    let user;
    try {
        user = await users.get(req.oidc.user.sub);
    } catch (e) {
        try {
            user = {
                username: req.oidc.user.sub,
                password: '',
                email: req.oidc.user.email,
                displayName: req.oidc.user.name
            };
            await users.add(user, constants.USER_SOURCE_OIDC);
        } catch (e) {
            console.error('Failed to add user', req.user.oidc.user, e);
            return next(new HttpError(500, 'internal error'));
        }
    }

    req.user = user;

    next();
}

async function login(req, res, next) {
    assert.strictEqual(typeof req.body, 'object');

    if (!req.body.username && typeof req.body.username !== 'string') return next(new HttpError(400, 'username must be string'));
    if (!req.body.password && typeof req.body.password !== 'string') return next(new HttpError(400, 'password must be string'));

    const user = await users.login(req.body.username, req.body.password);
    if (!user) return next(new HttpError(403, 'invalid username or password'));

    const accessToken = await tokens.add(user.username);

    user.diskusage = await diskusage.getByUsername(user.username);

    // req.session.username indicates a valid login session
    req.session.username = user.username;

    next(new HttpSuccess(200, { user, accessToken }));
}

async function logout(req, res, next) {
    req.session.username = null;

    next(new HttpSuccess(200, {}));
}

async function sessionAuth(req, res, next) {
    if (!req.session || !req.session.username) return next(new HttpError(401, 'No login session'));

    try {
        req.user = await users.get(req.session.username);
        if (!req.user) return next(new HttpError(401, 'Invalid login session'));
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next();
}

async function optionalSessionAuth(req, res, next) {
    if (!req.oidc.isAuthenticated()) return next(new HttpError(401, 'Unauthorized'));

    if (!req.oidc.user.sub) {
        req.user = null;
        return next();
    }

    try {
        req.user = await users.get(req.oidc.user.sub);
        if (!req.user) return next(new HttpError(401, 'Invalid login session'));
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next();
}

async function tokenAuth(req, res, next) {
    var accessToken = req.query.access_token || req.body.accessToken || '';

    try {
        req.user = await users.getByAccessToken(accessToken);
        if (!req.user) return next(new HttpError(401, 'Invalid Access Token'));
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next();
}

async function optionalTokenAuth(req, res, next) {
    var accessToken = req.query.access_token || req.body.accessToken || '';

    if (!accessToken) {
        req.user = null;
        return next();
    }

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

    const result = await diskusage.getByUsername(req.user.username);

    req.user.diskusage = result;

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
