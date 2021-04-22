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

function login(req, res, next) {
    assert.strictEqual(typeof req.body, 'object');

    if (!req.body.username && typeof req.body.username !== 'string') return next(new HttpError(400, 'username must be string'));
    if (!req.body.password && typeof req.body.password !== 'string') return next(new HttpError(400, 'password must be string'));

    users.login(req.body.username, req.body.password, function (error, user) {
        if (error && error.reason === MainError.ACCESS_DENIED) return next(new HttpError(403, 'invalid username or password'));

        tokens.add(user.id, function (error, accessToken) {
            if (error) return next(new HttpError(500, error));

            next(new HttpSuccess(200, { user, accessToken }));
        });
    });
}

function tokenAuth(req, res, next) {
    var accessToken = req.query.access_token || req.body.accessToken;

    users.getByAccessToken(accessToken, function (error, user) {
        if (error) return next(new HttpError(401, 'Invalid Access Token'));

        req.user = user;

        next();
    });
}

function profile(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    // TODO remove private fields
    next(new HttpSuccess(200, req.user));
}
