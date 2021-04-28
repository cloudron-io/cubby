'use strict';

var fs = require('fs');

var GLOBS2_FILE = '/usr/share/mime/globs2';

var gTypes = null;

function init() {
    if (gTypes) return;

    console.log(`Loading rich mime-types from ${GLOBS2_FILE}`);

    var glob2;
    gTypes = {};

    try {
        glob2 = fs.readFileSync(GLOBS2_FILE, 'utf8');
    } catch (e) {
        console.log('Failed to load globs2 file. Using built-in media-types.');
        return;
    }

    // we reverse the list to keep priorities correct
    glob2.split('\n').reverse().forEach(function (line) {
        if (line.startsWith('#')) return;

        var f = line.split(':');
        if (f.length <= 1) return;

        gTypes[f[2].slice(1)] = f[1];
    });
}

exports = module.exports = function (filePath) {
    if (!gTypes) init();

    const typeKey = Object.keys(gTypes).find(function (type) {
        return filePath.endsWith(type);
    });

    if (!typeKey) return 'application/octet-stream';

    return gTypes[typeKey];
};
