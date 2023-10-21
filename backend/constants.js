'use strict';

var path = require('path');

exports = module.exports = {
    FRONTEND_ROOT: path.resolve('public'),
    DATA_ROOT: process.env.CLOUDRON ? '/app/data/data/' : path.resolve(__dirname, '../.data'),
    THUMBNAIL_ROOT: process.env.CLOUDRON ? '/app/data/thumbnails/' : path.resolve(__dirname, '../.thumbnails')
};
