#!/usr/bin/env node

'use strict';

var constants = require('./backend/constants.js'),
    database = require('./backend/database.js'),
    server = require('./backend/server.js');

function exit(error) {
    if (error) console.error(error);
    process.exit(error ? 1 : 0);
}

database.init(function (error) {
    if (error) exit(error);

    server.init(function (error) {
        if (error) exit(error);

        console.log(`Using data folder at: ${constants.DATA_ROOT}`);
        console.log('Cubby running.');
    });
});
