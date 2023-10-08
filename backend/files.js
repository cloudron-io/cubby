'use strict';

exports = module.exports = {
    HOME: 'home',

    getValidFullPath,
    addDirectory,
    addOrOverwriteFile,
    addOrOverwriteFileContents,
    get,
    head,
    move,
    copy,
    remove,
    recent
};

var assert = require('assert'),
    constants = require('./constants.js'),
    debug = require('debug')('cubby:files'),
    fs = require('fs-extra'),
    path = require('path'),
    util = require('util'),
    exec = util.promisify(require('child_process').exec),
    mime = require('./mime.js'),
    Entry = require('./entry.js'),
    shares = require('./shares.js'),
    diskusage = require('./diskusage.js'),
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
        await fs.move(sourceFilePath, fullFilePath, { overwrite: true });
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

async function addOrOverwriteFileContents(username, filePath, content, mtime, overwrite) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof mtime, 'object');
    assert.strictEqual(typeof overwrite, 'boolean');
    assert.strict(Buffer.isBuffer(content));

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`addOrOverwriteFileContents: ${username} ${fullFilePath} mtime:${mtime} overwrite:${overwrite}`);

    var stat;
    try {
        stat = fs.statSync(fullFilePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw new MainError(MainError.FS_ERROR, error);
    }

    if (stat && !overwrite) throw new MainError(MainError.ALREADY_EXISTS);

    try {
        await fs.ensureDir(path.dirname(fullFilePath));
        await fs.writeFile(fullFilePath, content, 'utf8');
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

    // attach shares
    const sharedWith = await shares.getByOwnerAndFilepath(username, filePath);
    for (let file of files) {
        file.sharedWith = await shares.getByOwnerAndFilepath(username, file.filePath);
    }

    // attach diskusage
    const size = await diskusage.getByUsernameAndDirectory(username, filePath);
    for (let file of files) {
        if (!file.isDirectory) continue;

        file.size = await diskusage.getByUsernameAndDirectory(username, file.filePath);
    }

    return new Entry({
        fullFilePath: fullFilePath,
        fileName: path.basename(filePath),
        filePath: filePath,
        size: size,
        mtime: stats.mtime,
        isDirectory: true,
        isFile: false,
        owner: username,
        sharedWith: sharedWith || [],
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

    let size = 0;

    if (stats.isDirectory()) {
        try {
            size = await diskusage.getByUsernameAndDirectory(username, filePath);
        } catch (error) {
            console.error(error);
        }
    } else {
        size = stats.size;
    }

    return new Entry({
        fullFilePath: fullFilePath,
        fileName: path.basename(fullFilePath),
        filePath: filePath,
        size: size,
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

    let result;
    try {
        const stat = await fs.stat(fullFilePath);
        if (stat.isDirectory()) result = await getDirectory(username, fullFilePath, filePath, stat);
        if (stat.isFile()) result = await getFile(username, fullFilePath, filePath, stat);
    } catch (error) {
        if (error.code === 'ENOENT') throw new MainError(MainError.NOT_FOUND);
        throw new MainError(MainError.FS_ERROR, error);
    }

    return result;
}

async function head(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    debug(`head ${username} ${filePath}`);

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    try {
        const stat = await fs.stat(fullFilePath);
        return {
            fileName: path.basename(fullFilePath),
            filePath: filePath,
            size: stat.size,
            mtime: stat.mtime,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile(),
            // sharedWith: result || [],
            owner: username,
            mimeType: stat.isDirectory() ? 'inode/directory' : mime(filePath)
        };
    } catch (error) {
        if (error.code === 'ENOENT') throw new MainError(MainError.NOT_FOUND);
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function move(username, filePath, newUsername, newFilePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof newUsername, 'string');
    assert.strictEqual(typeof newFilePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const fullNewFilePath = getValidFullPath(newUsername, newFilePath);
    if (!fullNewFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`move ${fullFilePath} -> ${fullNewFilePath}`);

    try {
        // TODO add option for overwrite
        await fs.move(fullFilePath, fullNewFilePath, { overwrite: false });
    } catch (error) {
        if (error.message === 'Source and destination must not be the same.') throw new MainError(MainError.CONFLICT);
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function copy(username, filePath, newUsername, newFilePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');
    assert.strictEqual(typeof newUsername, 'string');
    assert.strictEqual(typeof newFilePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    const fullNewFilePath = getValidFullPath(newUsername, newFilePath);
    if (!fullNewFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`copy ${fullFilePath} -> ${fullNewFilePath}`);

    try {
        // TODO add option for overwrite
        await fs.copy(fullFilePath, fullNewFilePath, { overwrite: false });
    } catch (error) {
        if (error.message === 'Source and destination must not be the same.') throw new MainError(MainError.CONFLICT);
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function remove(username, filePath) {
    assert.strictEqual(typeof username, 'string');
    assert.strictEqual(typeof filePath, 'string');

    const fullFilePath = getValidFullPath(username, filePath);
    if (!fullFilePath) throw new MainError(MainError.INVALID_PATH);

    debug(`remove ${fullFilePath}`);

    try {
        await fs.remove(fullFilePath);
    } catch (error) {
        throw new MainError(MainError.FS_ERROR, error);
    }
}

async function recent(username, daysAgo = 3, maxFiles = 100) {
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

    // we limit files to maxFiles
    for (let filePath of filePaths.slice(0, maxFiles)) {
        try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile()) throw new MainError(MainError.FS_ERROR, 'recent should only list files');
            result.push(await getFile(username, filePath, filePath.slice(localResolvedPrefix.length), stat));
        } catch (error) {
            console.error(`Error in getting recent file ${filePath}`, error);
        }
    }

    return result;
}
