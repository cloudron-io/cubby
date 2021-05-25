#!/usr/bin/env node

'use strict';

var constants = require('./backend/constants.js'),
    database = require('./backend/database.js'),
    ldap = require('./backend/ldap.js'),
    config = require('./backend/config.js'),
    server = require('./backend/server.js');

function exit(error) {
    if (error) console.error(error);
    process.exit(error ? 1 : 0);
}

function sync() {
    ldap.sync(function (error) {
        if (error) console.error('LDAP sync error:', error);

        setTimeout(sync, 1000 * 60);
    });
}

database.init();
config.init(process.env.CLOUDRON ? '/app/data/config.json' : 'config.json');

sync();

server.init(function (error) {
    if (error) exit(error);

    console.log(`Using data folder at: ${constants.DATA_ROOT}`);
    console.log('cubby running.');
});
