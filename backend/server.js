'use strict';

var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    lastMile = require('connect-lastmile'),
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

    // var multipart = multipart({ maxFieldsSize: 2 * 1024, limit: '512mb', timeout: 3 * 60 * 1000 });

    // router.get   ('/api/profile', tokenAuth, auth.getProfile);
    // router.get   ('/api/files/*', tokenAuth);
    // router.post  ('/api/files/*', tokenAuth, multipart, files.post);
    // router.put   ('/api/files/*', tokenAuth, files.put);
    // router.delete('/api/files/*', tokenAuth, files.del);

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
