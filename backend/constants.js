'use strict';

var path = require('path');

exports = module.exports = {
    USER_SOURCE_LOCAL: 'local',
    USER_SOURCE_OIDC: 'oidc',

    FRONTEND_ROOT: path.resolve('public'),
    DATA_ROOT: process.env.CLOUDRON ? '/app/data/data/' : path.resolve(__dirname, '../.data'),
    THUMBNAIL_ROOT: process.env.CLOUDRON ? '/app/data/thumbnails/' : path.resolve(__dirname, '../.thumbnails')
};
