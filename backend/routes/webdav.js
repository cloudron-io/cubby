'use strict';

exports = module.exports = {
    express
};

var users = require('../users.js'),
    constants = require('../constants.js'),
    webdav = require('webdav-server').v2,
    PrivilegeManager = require('webdav-server').v2.PrivilegeManager,
    webdavErrors = require('webdav-server').v2.Errors;

class WebdavPrivilegeManager extends PrivilegeManager
{
    constructor() {
        super();
    }

    _can(fullPath, user, resource, privilege, callback) {
        // this is just the root
        if (resource.context.requested.uri === '/') return callback(null, true);

        // currently we only check for prefixes
        if (resource.context.requested.uri.indexOf('/' + user.username) !== 0) return callback(null, false);

        callback(null, true);
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

function express() {
    var webdavServer = new webdav.WebDAVServer({
        requireAuthentification: true,
        privilegeManager: new WebdavPrivilegeManager(),
        httpAuthentication: new webdav.HTTPBasicAuthentication(new WebdavUserManager(), 'Cubby')
    });

    webdavServer.setFileSystem('/', new webdav.PhysicalFileSystem(constants.DATA_ROOT), function (success) {
        if (!success) console.error('Failed to setup webdav server!');
    });

    return webdav.extensions.express('/webdav', webdavServer);
}
