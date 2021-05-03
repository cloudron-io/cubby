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
    util = require('util'),
    MainError = require('../mainerror.js'),
    Dom = require('xmldom').DOMParser,
    xpath = require('xpath'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

function boolLike(arg) {
    if (!arg) return false;
    if (util.isNumber(arg)) return !!arg;
    if (util.isString(arg) && arg.toLowerCase() === 'false') return false;

    return true;
}

// TODO make it configurable
const COLLABORA_ONLINE_HOST = 'https://office.nebulon.space';

async function getHandle(req, res, next) {
    let result;
    try {
        result = await superagent.get(COLLABORA_ONLINE_HOST + '/hosting/discovery');
    } catch (error) {
        return next(new HttpError(500, error));
    }

    var doc = new Dom().parseFromString(result.text);
    if (!doc) return next(new HttpError(500, 'The retrieved discovery.xml file is not a valid XML file'));

    var mimeType = 'text/plain';
    var nodes = xpath.select("/wopi-discovery/net-zone/app[@name='" + mimeType + "']/action", doc);
    if (!nodes || nodes.length !== 1) return next(new HttpError(500, 'The requested mime type is not handled'));

    var onlineUrl = nodes[0].getAttribute('urlsrc');
    res.json({
        url: onlineUrl,
        token: 'test'
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
function checkFileInfo (req, res) {
    console.log('file id: ' + req.params.fileId);
    // test.txt is just a fake text file
    // the Size property is the length of the string
    // returned by the wopi GetFile endpoint
    res.json({
        BaseFileName: 'test.txt',
        Size: 11,
        UserId: 1,
        UserCanWrite: true
    });
}

/* *
 *  wopi GetFile endpoint
 *
 *  Given a request access token and a document id, sends back the contents of the file.
 *  The GetFile wopi endpoint is triggered by a request with a GET verb at
 *  https://HOSTNAME/wopi/files/<document_id>/contents
 */
function getFile(req, res) {
    // we just return the content of a fake text file
    // in a real case you should use the file id
    // for retrieving the file from the storage and
    // send back the file content as response
    var fileContent = 'Hello world!';
    res.send(fileContent);
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
