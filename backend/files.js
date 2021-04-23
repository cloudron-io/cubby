'use strict';

exports = module.exports = {
    add,
    get,
    update,
    remove
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:fs'),
    fs = require('fs'),
    path = require('path'),
    MainError = require('./mainerror.js');

function getValidFullPath(username, filePath) {
    fs.mkdirSync(path.join(constants.DATA_ROOT, username), { recursive: true });

    const fullFilePath = path.resolve(path.join(constants.DATA_ROOT, username, filePath));
    if (fullFilePath.indexOf(path.join(constants.DATA_ROOT, username)) !== 0) return null;

    return fullFilePath;
}

function add(username, filePath, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof callback, 'function');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) return callback(new MainError(MainError.INVALID_PATH));
}

function getDirectory(fullFilePath, filePath, stats, callback) {
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');
    assert.strictEqual(typeof callback, 'function');

    fs.readdir(fullFilePath, function (error, result) {
        if (error) return callback(new MainError(MainError.FS_ERROR, error));

        var files = result.map(function (file) {
            try {
                var stat = fs.statSync(path.join(fullFilePath, file));
                return { name: file, stat: stat };
            } catch (e) {
                debug(`files: cannot stat ${path.join(fullFilePath, file)}`, e);
                return null;
            }
        }).filter(function (file) { return file && (file.stat.isDirectory() || file.stat.isFile()); }).map(function (file) {
            return {
                fileName: file.name,
                filePath: path.join(filePath, file.name),
                size: file.stat.size,
                mtime: file.stat.mtime,
                isDirectory: file.stat.isDirectory(),
                isFile: file.stat.isFile()
            };
        });

        callback(null, {
            _fullFilePath: fullFilePath,
            fileName: path.basename(filePath),
            filePath: filePath,
            size: stats.size,
            mtime: stats.mtime,
            isDirectory: true,
            isFile: false,
            files: files
        });
    });
}

function getFile(fullFilePath, filePath, stats, callback) {
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');
    assert.strictEqual(typeof callback, 'function');

    var file = {
        _fullFilePath: fullFilePath,
        fileName: path.basename(fullFilePath),
        filePath: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
    };

    callback(null, file);
}

function get(username, filePath, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof callback, 'function');

    debug(`file: get ${username} ${filePath}`);

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) return callback(new MainError(MainError.INVALID_PATH));

    fs.stat(fullFilePath, function (error, result) {
        if (error && error.code === 'ENOENT') return callback(new MainError(MainError.NOT_FOUND));
        if (error) return callback(new MainError(MainError.FS_ERROR, error));

        if (result.isDirectory()) return getDirectory(fullFilePath, filePath, result, callback);
        if (result.isFile()) return getFile(fullFilePath, filePath, result, callback);

        return callback(new MainError(MainError.FS_ERROR, 'unsupported type'));
    });
}

function update(username, filePath, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof callback, 'function');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) return callback(new MainError(MainError.INVALID_PATH));
}

function remove(username, filePath, recursive, callback) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof recursive, 'boolean');
    assert.strictEqual(typeof callback, 'function');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) return callback(new MainError(MainError.INVALID_PATH));
}