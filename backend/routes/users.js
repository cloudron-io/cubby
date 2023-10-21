'use strict';

exports = module.exports = {
    isAuthenticated,
    tokenAuth,
    sessionAuth,
    optionalSessionAuth,
    profile,
    list
};

var assert = require('assert'),
    users = require('../users.js'),
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
            await users.add(user);
        } catch (e) {
            console.error('Failed to add user', req.user.oidc.user, e);
            return next(new HttpError(500, 'internal error'));
        }
    }

    req.user = user;

    next();
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

// following middlewares have to check req.user if needed, like public share links
async function optionalSessionAuth(req, res, next) {
    if (!req.oidc.user || !req.oidc.user.sub) {
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
