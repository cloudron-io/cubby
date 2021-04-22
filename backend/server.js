'use strict';

var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    lastMile = require('connect-lastmile'),
    users = require('./routes/users.js'),
    files = require('./routes/files.js'),
    multipart = require('./routes/multipart.js'),
    morgan = require('morgan'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

exports = module.exports = {
    init
};

// function tokenAuth(req, res, next) {
//     next();
// }


function init(callback) {
    var app = express();
    var router = new express.Router();

    app.set('json spaces', 2); // pretty json

    // for rate limiting
    app.enable('trust proxy');

    app.use(morgan(function (tokens, req, res) {
        return [
            'Cubby',
            tokens.method(req, res),
            tokens.url(req, res).replace(/(access_token=)[^&]+/, '$1' + '<redacted>'),
            tokens.status(req, res),
            res.errorBody ? res.errorBody.status : '',  // attached by connect-lastmile. can be missing when router errors like 404
            res.errorBody ? res.errorBody.message : '', // attached by connect-lastmile. can be missing when router errors like 404
            tokens['response-time'](req, res), 'ms', '-',
            tokens.res(req, res, 'content-length')
        ].join(' ');
    }, {
        immediate: false,
        // only log failed requests by default
        // skip: function (req, res) { return res.statusCode < 400; }
    }));

    router.del = router.delete; // amend router.del for readability further on

    router.post('/api/v1/login', users.login);
    router.get ('/api/v1/profile', users.tokenAuth, users.profile);

    router.get ('/api/v1/files', users.tokenAuth, files.get);
    router.post('/api/v1/files', users.tokenAuth, multipart({ maxFieldsSize: 2 * 1024, limit: '512mb', timeout: 3 * 60 * 1000 }), files.add);
    router.put ('/api/v1/files', users.tokenAuth, files.update);
    router.del ('/api/v1/files', users.tokenAuth, files.remove);

    app.use('/api/healthcheck', function (req, res) { res.status(200).send(); });
    app.use('/api', bodyParser.json());
    app.use('/api', bodyParser.urlencoded({ extended: false, limit: '100mb' }));
    app.use(router);
    app.use('/', express.static(path.resolve(__dirname, '../dist')));

    app.use(lastMile());

    var server = app.listen(3000, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log(`Listening on http://${host}:${port}`);

        callback(null);
    });
}
