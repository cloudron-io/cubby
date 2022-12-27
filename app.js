#!/usr/bin/env node

'use strict';

var constants = require('./backend/constants.js'),
    database = require('./backend/database.js'),
    fs = require('fs'),
    ldap = require('./backend/ldap.js'),
    config = require('./backend/config.js'),
    diskusage = require('./backend/diskusage.js'),
    server = require('./backend/server.js');

function exit(error) {
    if (error) console.error(error);
    process.exit(error ? 1 : 0);
}

database.init();
config.init(process.env.CLOUDRON ? '/app/data/config.json' : 'config.json');

// ensure data directory or crash
fs.mkdirSync(constants.DATA_ROOT, { recursive: true });

// we shall crash if this fails
diskusage.calculate();

// sync user listing
ldap.sync();

// currently just update this every hour to put less strain on the disk
setInterval(diskusage.calculate, 1000 * 60 * 60);
setInterval(ldap.sync, 1000 * 60);

server.init(function (error) {
    if (error) exit(error);

    console.log(`Using data folder at: ${constants.DATA_ROOT}`);
    console.log('Cubby is up and running.');
});
