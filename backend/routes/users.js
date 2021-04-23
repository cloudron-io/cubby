'use strict';

exports = module.exports = {
    login,
    tokenAuth,
    profile
};

var assert = require('assert'),
    users = require('../users.js'),
    tokens = require('../tokens.js'),
    MainError = require('../mainerror.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

async function login(req, res, next) {
    assert.strictEqual(typeof req.body, 'object');

    if (!req.body.username && typeof req.body.username !== 'string') return next(new HttpError(400, 'username must be string'));
    if (!req.body.password && typeof req.body.password !== 'string') return next(new HttpError(400, 'password must be string'));

    const user = await users.login(req.body.username, req.body.password);
    if (!user) return next(new HttpError(403, 'invalid username or password'));

    const accessToken = await tokens.add(user.id);

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
