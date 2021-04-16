#!/usr/bin/env node

'use strict';

var server = require('./backend/server.js');

server.init(function (error) {
    if (error) {
        console.error(error);
        process.exit(1);
    }

    console.log('Cubby server running.');
});
