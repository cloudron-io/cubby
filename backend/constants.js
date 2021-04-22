'use strict';

var path = require('path');

exports = module.exports = {
    USER_SOURCE_LOCAL: 'local',
    USER_SOURCE_LDAP: 'ldap',

    DATA_ROOT: process.env.CLOUDRON ? '/app/data/data/' : path.resolve(__dirname, '../.data')
};
