'use strict';

exports = module.exports = {
    getHandle,
    checkFileInfo,
    getFile,
    putFile
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:office'),
    superagent = require('superagent'),
    MainError = require('../mainerror.js'),
    files = require('../files.js'),
    shares = require('../shares.js'),
    Dom = require('xmldom').DOMParser,
    xpath = require('xpath'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

// TODO make it configurable
const COLLABORA_ONLINE_HOST = 'https://office.nebulon.space';

async function getHandle(req, res, next) {
    var filePath = decodeURIComponent(req.query.path);

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    let result;
    try {
        result = await superagent.get(COLLABORA_ONLINE_HOST + '/hosting/discovery');
    } catch (error) {
        return next(new HttpError(500, error));
    }

    var doc = new Dom().parseFromString(result.text);
    if (!doc) return next(new HttpError(500, 'The retrieved discovery.xml file is not a valid XML file'));

    // currently for collabora urlsrc for all mimeTypes is the same
    var mimeType = 'text/plain';
    var nodes = xpath.select("/wopi-discovery/net-zone/app[@name='" + mimeType + "']/action", doc);
    if (!nodes || nodes.length !== 1) return next(new HttpError(500, 'The requested mime type is not handled'));

    let shareId;
    try {
        shareId = await shares.create({
            user: req.user,
            filePath: req.query.filePath,
            receiverUsername: req.user.username
        });
    } catch (error) {
        return next(new HttpError(500, error));
    }

    var onlineUrl = nodes[0].getAttribute('urlsrc');
    res.json({
        shareId: shareId,
        url: onlineUrl,
        token: 'unused'
    });
}

/* *
 *  wopi CheckFileInfo endpoint
 *
 *  Returns info about the file with the given document id.
 *  The response has to be in JSON format and at a minimum it needs to include
 *  the file name and the file size.
 *  The CheckFileInfo wopi endpoint is triggered by a GET request at
 *  https://HOSTNAME/wopi/files/<document_id>
 */
async function checkFileInfo(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const shareId = req.params.shareId;
    if (!shareId) return next(new HttpError(400, 'missing or invalid shareId'));

    debug(`checkFileInfo: ${shareId}`);

    let result;
    try {
        result = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    // TODO check if shared with others
    if (result.receiverUsername !== req.user.username) return next(new HttpError(404, 'not found'));

    try {
        result = await files.get(req.user.username, result.filePath);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    if (result.isDirectory) return next(new HttpError(417, 'not supported for directories'));

    next(new HttpSuccess(200, {
        BaseFileName: result.fileName,
        Size: result.size,
        UserId: req.user.username,
        UserCanWrite: true
    }));
}

/* *
 *  wopi GetFile endpoint
 *
 *  Given a request access token and a document id, sends back the contents of the file.
 *  The GetFile wopi endpoint is triggered by a request with a GET verb at
 *  https://HOSTNAME/wopi/files/<document_id>/contents
 */
async function getFile(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    const shareId = req.params.shareId;
    if (!shareId) return next(new HttpError(400, 'missing or invalid shareId'));

    debug(`getFile: ${shareId}`);

    let result;
    try {
        result = await shares.get(shareId);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    // TODO check if shared with others
    if (result.receiverUsername !== req.user.username) return next(new HttpError(404, 'not found'));

    try {
        result = await files.get(req.user.username, result.filePath);
    } catch (error) {
        if (error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        return next(new HttpError(500, error));
    }

    if (result.isDirectory) return next(new HttpError(417, 'not supported for directories'));

    return res.sendFile(result._fullFilePath);
}

/* *
 *  wopi PutFile endpoint
 *
 *  Given a request access token and a document id, replaces the files with the POST request body.
 *  The PutFile wopi endpoint is triggered by a request with a POST verb at
 *  https://HOSTNAME/wopi/files/<document_id>/contents
 */
function putFile(req, res) {
    // we log to the console so that is possible
    // to check that saving has triggered this wopi endpoint
    console.log('wopi PutFile endpoint');
    if (req.body) {
        console.dir(req.body);
        console.log(req.body.toString());
        res.sendStatus(200);
    } else {
        console.log('Not possible to get the file content.');
        res.sendStatus(404);
    }
}
