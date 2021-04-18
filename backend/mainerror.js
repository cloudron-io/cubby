'use strict';

const assert = require('assert'),
    HttpError = require('connect-lastmile').HttpError,
    util = require('util'),
    _ = require('underscore');

exports = module.exports = MainError;

function MainError(reason, errorOrMessage, details) {
    assert.strictEqual(typeof reason, 'string');
    assert(errorOrMessage instanceof Error || typeof errorOrMessage === 'string' || typeof errorOrMessage === 'undefined');
    assert(typeof details === 'object' || typeof details === 'undefined');

    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.reason = reason;
    this.details = details || {};

    if (typeof errorOrMessage === 'undefined') {
        this.message = reason;
    } else if (typeof errorOrMessage === 'string') {
        this.message = errorOrMessage;
    } else { // error object
        this.message = errorOrMessage.message;
        this.nestedError = errorOrMessage;
        _.extend(this.details, errorOrMessage); // copy enumerable properies
    }
}
util.inherits(MainError, Error);
MainError.ACCESS_DENIED = 'Access Denied';
MainError.ALREADY_EXISTS = 'Already Exists';
MainError.BAD_FIELD = 'Bad Field';
MainError.BAD_STATE = 'Bad State';
MainError.BUSY = 'Busy';
MainError.CONFLICT = 'Conflict';
MainError.DATABASE_ERROR = 'Database Error';
MainError.EXTERNAL_ERROR = 'External Error'; // use this for external API errors
MainError.FS_ERROR = 'FileSystem Error';
MainError.INTERNAL_ERROR = 'Internal Error';
MainError.INVALID_CREDENTIALS = 'Invalid Credentials';
MainError.MAIL_ERROR = 'Mail Error';
MainError.NETWORK_ERROR = 'Network Error';
MainError.NOT_FOUND = 'Not found';
MainError.NOT_IMPLEMENTED = 'Not implemented';
MainError.TIMEOUT = 'Timeout';
MainError.TRY_AGAIN = 'Try Again';

MainError.prototype.toPlainObject = function () {
    return _.extend({}, { message: this.message, reason: this.reason }, this.details);
};

// this is a class method for now in case error is not a MainError
MainError.toHttpError = function (error) {
    switch (error.reason) {
    case MainError.BAD_FIELD:
        return new HttpError(400, error);
    case MainError.NOT_FOUND:
        return new HttpError(404, error);
    case MainError.ALREADY_EXISTS:
    case MainError.BAD_STATE:
    case MainError.CONFLICT:
        return new HttpError(409, error);
    case MainError.INVALID_CREDENTIALS:
        return new HttpError(412, error);
    case MainError.EXTERNAL_ERROR:
    case MainError.NETWORK_ERROR:
    case MainError.FS_ERROR:
    case MainError.MAIL_ERROR:
        return new HttpError(424, error);
    case MainError.DATABASE_ERROR:
    case MainError.INTERNAL_ERROR:
    default:
        return new HttpError(500, error);
    }
};
