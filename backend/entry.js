'use strict';

const assert = require('assert');

exports = module.exports = Entry;

function Entry({ fullFilePath, filePath, fileName, size = 0, mtime = new Date(), isDirectory, isFile, mimeType, files = [], share = null, sharedWith = [] }) {
    assert(fullFilePath && typeof fullFilePath === 'string');
    assert(filePath && typeof filePath === 'string');
    assert(typeof fileName === 'string');
    assert.strictEqual(typeof size, 'number');
    assert(mtime instanceof Date && !isNaN(mtime.valueOf()));
    assert.strictEqual(typeof isDirectory, 'boolean');
    assert(mimeType && typeof mimeType === 'string');
    assert.strictEqual(typeof share, 'object');
    assert(Array.isArray(sharedWith));

    // TODO check that files is an array of Entries

    this._fullFilePath = fullFilePath;
    this.fileName = fileName;
    this.filePath = filePath;
    this.size = size;
    this.mtime = mtime;
    this.isDirectory = isDirectory;
    this.isFile = isFile;
    this.mimeType = mimeType;
    this.files = files;
    this.share = share;
    this.sharedWith = sharedWith;
}

Entry.prototype.withoutPrivate = function () {
    return {
        fileName: this.fileName,
        filePath: this.filePath,
        size: this.size,
        mtime: this.mtime,
        isDirectory: this.isDirectory,
        isFile: this.isFile,
        mimeType: this.mimeType,
        files: this.files.map(function (f) { return f.withoutPrivate(); }),
        share: this.share,
        sharedWith: this.sharedWith
    };
};
