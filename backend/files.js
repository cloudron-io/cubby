'use strict';

exports = module.exports = {
    getValidFullPath,
    addDirectory,
    addOrOverwriteFile,
    get,
    move,
    remove,
    recent
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:files'),
    fs = require('fs-extra'),
    async = require('async'),
    path = require('path'),
    util = require('util'),
    exec = util.promisify(require('child_process').exec),
    mime = require('./mime.js'),
    Entry = require('./entry.js'),
    shares = require('./shares.js'),
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

async function addOrOverwriteFile(username, filePath, sourceFilePath, mtime, overwrite) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof mtime, 'object');
    assert.strictEqual(typeof overwrite, 'boolean');
    assert.strictEqual(typeof sourceFilePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`addOrOverwriteFile: ${username} ${fullFilePath} mtime:${mtime} overwrite:${overwrite}`);

    var stat;
    try {
        stat = fs.statSync(fullFilePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw new MainError(MainError.FS_ERROR, error);
    }

    if (stat && !overwrite) throw new MainError(MainError.ALREADY_EXISTS);

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

async function getDirectory(username, fullFilePath, filePath, stats) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');

    let files;

    try {
        const contents = await fs.readdir(fullFilePath);
        files = contents.map(function (file) {
            try {
                var stat = fs.statSync(path.join(fullFilePath, file));
                return { name: file, stat: stat, fullFilePath: path.join(fullFilePath, file) };
            } catch (e) {
                debug(`getDirectory: cannot stat ${path.join(fullFilePath, file)}`, e);
                return null;
            }
        }).filter(function (file) { return file && (file.stat.isDirectory() || file.stat.isFile()); }).map(function (file) {
            return new Entry({
                fullFilePath: file.fullFilePath,
                fileName: file.name,
                filePath: path.join(filePath, file.name),
                size: file.stat.size,
                mtime: file.stat.mtime,
                isDirectory: file.stat.isDirectory(),
                isFile: file.stat.isFile(),
                owner: username,
                mimeType: file.stat.isDirectory() ? 'inode/directory' : mime(file.name)
            });
        });
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }

    await async.each(files, async function (file) {
        let result;
        try {
            result = await shares.getByOwnerAndFilepath(username, file.filePath);
        } catch (error) {
            // TODO not sure what to do here
            console.error(error);
        }

        file.sharedWith = result || null;
    });

    let result;
    try {
        result = await shares.getByOwnerAndFilepath(username, filePath);
    } catch (error) {
        // TODO not sure what to do here
        console.error(error);
    }

    return new Entry({
        fullFilePath: fullFilePath,
        fileName: path.basename(filePath),
        filePath: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: true,
        isFile: false,
        owner: username,
        sharedWith: result || [],
        mimeType: 'inode/directory',
        files: files
    });
}

async function getFile(username, fullFilePath, filePath, stats) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof fullFilePath, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof stats, 'object');

    debug(`getFile: ${username} ${fullFilePath}`);

    let result;
    try {
        result = await shares.getByOwnerAndFilepath(username, filePath);
    } catch (error) {
        // TODO not sure what to do here
        console.error(error);
    }

    return new Entry({
        fullFilePath: fullFilePath,
        fileName: path.basename(fullFilePath),
        filePath: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        sharedWith: result || [],
        owner: username,
        mimeType: stats.isDirectory() ? 'inode/directory' : mime(filePath)
    });
}

async function get(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    debug(`get ${username} ${filePath}`);

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    try {
        const stat = await fs.stat(fullFilePath);
        if (stat.isDirectory()) return await getDirectory(username, fullFilePath, filePath, stat);
        if (stat.isFile()) return await getFile(username, fullFilePath, filePath, stat);
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

    debug(`move ${fullFilePath} -> ${fullNewFilePath}`);

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

async function recent(username, daysAgo = 3) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof daysAgo, 'number');

    const fullFilePath = getValidFullPath(username, '/');
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    let filePaths = [];
    try {
        // -mtime 3 == 3 days ago
        const { stdout } = await exec(`find ${fullFilePath} -type f -mtime -${daysAgo}`);
        filePaths = stdout.toString().split('\n').map(function (f) { return f.trim(); }).filter(function (f) { return !!f; });
    } catch (error) {
        throw new MainError(MainError.INTERNAL_ERROR, error);
    }

    let result = [];

    const localResolvedPrefix = path.join(constants.DATA_ROOT, username);
    await async.each(filePaths, async function (filePath) {
        try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile()) throw new MainError(MainError.FS_ERROR, 'recent should only list files');
            result.push(await getFile(username, filePath, filePath.slice(localResolvedPrefix.length), stat));
        } catch (error) {
            console.error('error in getting recents:', error);
        }
    });

    return result;
}
