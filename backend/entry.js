'use strict';

const assert = require('assert');

exports = module.exports = Entry;

function Entry({ fullFilePath, filePath, fileName, owner, size = 0, mtime = new Date(), isDirectory, isFile, mimeType, files = [], sharedWith = [], share = null }) {
    assert(fullFilePath && typeof fullFilePath === 'string');
    assert(filePath && typeof filePath === 'string');
    assert(owner && typeof owner === 'string');
    assert(typeof fileName === 'string');
    assert.strictEqual(typeof size, 'number');
    assert(mtime instanceof Date && !isNaN(mtime.valueOf()));
    assert.strictEqual(typeof isDirectory, 'boolean');
    assert(mimeType && typeof mimeType === 'string');
    assert(Array.isArray(sharedWith));
    assert.strictEqual(typeof share, 'object');

    // TODO check that files is an array of Entries

    this._fullFilePath = fullFilePath;
    this.fileName = fileName;
    this.filePath = filePath;
    this.owner = owner;
    this.size = size;
    this.mtime = mtime;
    this.isDirectory = isDirectory;
    this.isFile = isFile;
    this.mimeType = mimeType;
    this.files = files;
    this.sharedWith = sharedWith;
    this.share = share;
}

Entry.prototype.withoutPrivate = function (username) {
    return {
        fileName: this.fileName,
        filePath: this.filePath,
        owner: this.owner,
        size: this.size,
        mtime: this.mtime,
        isDirectory: this.isDirectory,
        isFile: this.isFile,
        mimeType: this.mimeType,
        files: this.files.map(function (f) { return f.withoutPrivate(username); }),
        share: this.share,
        sharedWith: this.sharedWith || []
    };
};
