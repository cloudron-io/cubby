'use strict';

var express = require('express'),
    path = require('path'),
    superagent = require('superagent'),
    bodyParser = require('body-parser'),
    lastMile = require('connect-lastmile'),
    Dom = require('xmldom').DOMParser,
    xpath = require('xpath'),
    config = require('./config.js'),
    cors = require('./cors.js'),
    users = require('./routes/users.js'),
    files = require('./routes/files.js'),
    shares = require('./routes/shares.js'),
    office = require('./routes/office.js'),
    webdav = require('./routes/webdav.js'),
    misc = require('./routes/misc.js'),
    multipart = require('./routes/multipart.js'),
    morgan = require('morgan'),
    oidc = require('express-openid-connect'),
    session = require('express-session'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

exports = module.exports = {
    init
};

const PORT = process.env.PORT || 3000;
const APP_ORIGIN = process.env.CLOUDRON_APP_ORIGIN || `http://localhost:${PORT}`;

function init(callback) {
    var app = express();

    var router = new express.Router();

    app.set('json spaces', 2); // pretty json

    const FileStore = require('session-file-store')(session);

    const sessionOptions = {
        store: new FileStore({ path: process.env.CLOUDRON ? '/app/data/sessions' : path.resolve('./.sessions') }),
        secret: 'cubby goes lightly',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7 // one week
        }
    };

    if (process.env.CLOUDRON) {
        app.enable('trust proxy');
        sessionOptions.cookie.secure = true;
    }

    app.use(morgan(function (tokens, req, res) {
        return [
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

    // currently for local development. vite runs on http://localhost:5173
    app.use(cors({ origins: [ '*' ], allowCredentials: true }))

    app.use(session(sessionOptions));

    router.del = router.delete; // amend router.del for readability further on

    function oidcLogin(req, res) {
        res.oidc.login({
            returnTo: '/',
            authorizationParams: {
                redirect_uri: `${APP_ORIGIN}/api/v1/callback`,
            }
        });
    }

    // router.post('/api/v1/login', users.login);
    router.get ('/api/v1/logout', users.logout);

    router.get ('/api/v1/profile', users.isAuthenticated, users.profile);
    router.get ('/api/v1/config', users.isAuthenticated, async function (req, res, next) {
        // currently we only send configs for collabora

        const tmp = {
            viewers: {}
        };

        const collaboraHost = config.get('collabora.host', '');
        if (collaboraHost) {
            let result;
            try {
                result = await superagent.get(`${collaboraHost}/hosting/discovery`);
            } catch (error) {
                console.error('Failed to get collabora config.', error);
            }

            var doc = new Dom().parseFromString(result.text);
            if (doc) {
                var nodes = xpath.select("/wopi-discovery/net-zone/app/action", doc);
                if (nodes) {
                    const extensions = nodes.map(function (n) { return n.getAttribute('ext'); }).filter(function (e) { return !!e; });
                    tmp.viewers.collabora = { extensions };
                }
            }
        }

        next(new HttpSuccess(200, tmp));
    });

    router.get ('/api/v1/oidc/login', oidcLogin);

    router.get ('/api/v1/users', users.isAuthenticated, users.list);

    router.get ('/api/v1/recent', users.isAuthenticated, files.recent);

    router.head('/api/v1/files', users.isAuthenticated, files.head);
    router.get ('/api/v1/files', users.isAuthenticated, files.get);
    router.post('/api/v1/files', users.isAuthenticated, multipart({ maxFieldsSize: 2 * 1024, limit: '512mb', timeout: 3 * 60 * 1000 }), files.add);
    router.put ('/api/v1/files', users.isAuthenticated, files.update);
    router.del ('/api/v1/files', users.isAuthenticated, files.remove);

    router.get ('/api/v1/shares', users.isAuthenticated, shares.listShares);
    router.post('/api/v1/shares', users.isAuthenticated, shares.createShare);
    router.del ('/api/v1/shares', users.isAuthenticated, shares.removeShare);

    router.head('/api/v1/shares/:shareId', users.optionalTokenAuth, shares.attachReceiver, shares.head);
    router.get ('/api/v1/shares/:shareId', users.optionalTokenAuth, shares.attachReceiver, shares.get);
    router.post('/api/v1/shares/:shareId', users.optionalTokenAuth, shares.attachReceiver, multipart({ maxFieldsSize: 2 * 1024, limit: '512mb', timeout: 3 * 60 * 1000 }), shares.add);
    router.put ('/api/v1/shares/:shareId', users.optionalTokenAuth, shares.attachReceiver, shares.update);
    router.del ('/api/v1/shares/:shareId', users.optionalTokenAuth, shares.attachReceiver, shares.remove);

    router.get ('/api/v1/preview/:type/:id/:hash', users.optionalSessionAuth, misc.getPreview);

    router.get ('/api/v1/download', users.isAuthenticated, misc.download);

    router.get ('/api/v1/office/handle', users.sessionAuth, office.getHandle);
    router.get ('/api/v1/office/wopi/files/:shareId', users.tokenAuth, office.checkFileInfo);
    router.get ('/api/v1/office/wopi/files/:shareId/contents', users.tokenAuth, office.getFile);
    router.post('/api/v1/office/wopi/files/:shareId/contents', users.tokenAuth, bodyParser.raw(), office.putFile);

    app.use('/api/healthcheck', function (req, res) { res.status(200).send(); });
    app.use('/api', bodyParser.json());
    app.use('/api', bodyParser.urlencoded({ extended: false, limit: '100mb' }));
    app.use(webdav.express());

    if (process.env.CLOUDRON_OIDC_ISSUER) {
        app.use(oidc.auth({
            issuerBaseURL: process.env.CLOUDRON_OIDC_ISSUER,
            baseURL: process.env.CLOUDRON_APP_ORIGIN,
            clientID: process.env.CLOUDRON_OIDC_CLIENT_ID,
            clientSecret: process.env.CLOUDRON_OIDC_CLIENT_SECRET,
            secret: 'FIXME this secret',
            authorizationParams: {
                response_type: 'code',
                scope: 'openid profile email'
            },
            authRequired: false,
            routes: {
                callback: '/api/v1/oidc/callback',
                login: false,
                logout: '/api/v1/oidc/logout'
            }
        }));
    } else {
        // mock oidc
        let loginSession = false;

        app.use((req, res, next) => {
            res.oidc = {
                login(options) {
                    console.log('---', options, req.session, req.query, req.body)
                    loginSession = true;
                    res.redirect(options.authorizationParams.redirect_uri);
                }
            };
            req.oidc = {
                user: {
                    sub: 'admin',
                    family_name: 'Cloudron',
                    given_name: 'Admin',
                    locale: 'en-US',
                    name: 'Cloudron Admin',
                    preferred_username: 'admin',
                    email: 'admin@cloudron.local',
                    email_verified: true
                },
                isAuthenticated() {
                    return loginSession;
                }
            };

            next();
        });

        app.use('/api/v1/callback', (req, res) => {
            res.redirect(`http://localhost:${process.env.VITE_DEV_PORT || process.env.PORT}/`);
        });

        app.use('/api/v1/logout', (req, res) => {
            loginSession = false;
            res.status(200).send({});
        });
    }

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
