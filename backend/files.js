'use strict';

exports = module.exports = {
    addDirectory,
    addFile,
    get,
    move,
    remove
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:fs'),
    fs = require('fs-extra'),
    path = require('path'),
    MainError = require('./mainerror.js');

function getValidFullPath(username, filePath) {
    fs.mkdirSync(path.join(constants.DATA_ROOT, username), { recursive: true });

    const fullFilePath = path.resolve(path.join(constants.DATA_ROOT, username, filePath));
    if (fullFilePath.indexOf(path.join(constants.DATA_ROOT, username)) !== 0) return null;

    return fullFilePath;
}

async function addDirectory(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    debug('addDirectory:', fullFilePath);

    try {
        var stat = fs.statSync(fullFilePath);
        if (stat) throw new MainError(MainError.ALREADY_EXISTS);
    } catch (error) {
        if (error.code !== 'ENOENT') throw new MainError(MainError.FS_ERROR, error);
    }

    try {
        await fs.ensureDir(fullFilePath);
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function addFile(username, filePath, sourceFilePath, mtime) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof mtime, 'object');
    assert.strictEqual(typeof sourceFilePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    debug('addFile:', fullFilePath);

    try {
        var stat = fs.statSync(fullFilePath);
        if (stat) throw new MainError(MainError.ALREADY_EXISTS);
    } catch (error) {
        if (error.code !== 'ENOENT') throw new MainError(MainError.FS_ERROR, error);
    }

    try {
        await fs.ensureDir(path.dirname(fullFilePath));
        await fs.copy(sourceFilePath, fullFilePath);
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }

    if (!mtime) return;

    try {
        var fd = fs.openSync(fullFilePath);
        fs.futimesSync(fd, mtime, mtime);
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function getDirectory(fullFilePath, filePath, stats) {
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');

    let files;

    try {
        const contents = await fs.readdir(fullFilePath);
        files = contents.map(function (file) {
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
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }

    return {
        _fullFilePath: fullFilePath,
        fileName: path.basename(filePath),
        filePath: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: true,
        isFile: false,
        files: files
    };
}

async function getFile(fullFilePath, filePath, stats) {
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');

    var file = {
        _fullFilePath: fullFilePath,
        fileName: path.basename(fullFilePath),
        filePath: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
    };

    return file;
}

async function get(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    debug(`file: get ${username} ${filePath}`);

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    try {
        const stat = await fs.stat(fullFilePath);
        if (stat.isDirectory()) return await getDirectory(fullFilePath, filePath, stat);
        if (stat.isFile()) return await getFile(fullFilePath, filePath, stat);
    } catch (error) {
        if (error.code === 'ENOENT') throw new MainError(MainError.NOT_FOUND);
        throw new MainError(MainError.FS_ERROR, error);
    }
}

function move(username, filePath, newFilePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof newFilePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const fullNewFilePath = getValidFullPath(username, newFilePath);
    if (!fullNewFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`file: move ${fullFilePath} -> ${fullNewFilePath}`);

    try {
        // TODO add option for overwrite
        fs.move(fullFilePath, fullNewFilePath, { overwrite: false });
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function remove(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    try {
        await fs.remove(fullFilePath);
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }
}