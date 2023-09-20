
import { filesize } from 'filesize';
import superagent from 'superagent';

function prettyDate(value) {
    var date = new Date(value),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0)
        return;

    return day_diff === 0 && (
        diff < 60 && 'just now' ||
        diff < 120 && '1 min ago' ||
        diff < 3600 && Math.floor( diff / 60 ) + ' min ago' ||
        diff < 7200 && '1 hour ago' ||
        diff < 86400 && Math.floor( diff / 3600 ) + ' hours ago') ||
        day_diff === 1 && 'Yesterday' ||
        day_diff < 7 && day_diff + ' days ago' ||
        day_diff < 31 && Math.ceil( day_diff / 7 ) + ' weeks ago' ||
        day_diff < 365 && Math.round( day_diff / 30 ) +  ' months ago' ||
        Math.round( day_diff / 365 ) + ' years ago';
}

function prettyLongDate(value) {
    if (!value) return 'unkown';

    var date = new Date(value);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function prettyFileSize(value) {
    if (typeof value !== 'number') return 'unkown';

    return filesize(value);
}

function sanitize(path) {
    path = '/' + path;
    return path.replace(/\/+/g, '/');
}

function encode(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

function decode(path) {
    return path.split('/').map(decodeURIComponent).join('/');
}

// TODO create share links instead of using access token
function getDirectLink(entry) {
    if (entry.share) {
        let link = window.location.origin + '/api/v1/shares/' + entry.share.id + '?type=raw&path=' + encodeURIComponent(entry.filePath);
        return link;
    } else {
        return window.location.origin + '/api/v1/files?type=raw&path=' + encodeURIComponent(entry.filePath);
    }
}

// TODO the url might actually return a 412 in which case we have to keep reloading
function getPreviewUrl(entry) {
    if (!entry.previewUrl) return '';
    return entry.previewUrl;
}

function getFileTypeGroup(entry) {
    return entry.mimeType.split('/')[0];
}

// simple extension detection, does not work with double extension like .tar.gz
function getExtension(entry) {
    if (entry.isFile) return entry.fileName.slice(entry.fileName.lastIndexOf('.') + 1);
    return '';
}

function copyToClipboard(value) {
    var elem = document.createElement('input');
    elem.value = value;
    document.body.append(elem);
    elem.select();
    document.execCommand('copy');
    elem.remove();
}

function urlSearchQuery() {
    return decodeURIComponent(window.location.search).slice(1).split('&').map(function (item) { return item.split('='); }).reduce(function (o, k) { o[k[0]] = k[1]; return o; }, {});
}

// those paths contain the internal type and path reference eg. shares/:shareId/folder/filename or files/folder/filename
function parseResourcePath(resourcePath) {
    var result = {
        type: '',
        path: '',
        parentResourcePath: '',
        shareId: '',
        id: '',
        resourcePath: ''
    };

    if (resourcePath.indexOf('/home/') === 0) {
        result.type = 'home';
        result.path = resourcePath.slice('/home'.length) || '/';
        result.parentResourcePath = result.path === '/' ? null : '/home' + result.path.slice(0, result.path.lastIndexOf('/')) + '/';
        result.id = 'home';
        result.resourcePath = `/${result.type}${result.path}`;
    } else if (resourcePath.indexOf('/recent/') === 0) {
        result.type = 'recent';
        result.path = resourcePath.slice('/recent'.length) || '/';
        result.parentResourcePath = result.path === '/' ? null : '/recent' + result.path.slice(0, result.path.lastIndexOf('/')) + '/';
        result.id = 'recent';
        result.resourcePath = `/${result.type}${result.path}`;
    } else if (resourcePath.indexOf('/shares/') === 0) {
        result.type = 'shares';
        result.shareId = resourcePath.split('/')[2];
        result.path = resourcePath.slice(('/' + result.type + '/' + result.shareId).length) || '/';
        result.parentResourcePath = result.shareId ? ('/shares/' + result.shareId + result.path.slice(0, result.path.lastIndexOf('/')) + '/') : '/shares/';
        result.id = 'shares';
        // without shareId we show the root (share listing)
        result.resourcePath = `/${result.type}/` + (result.shareId ? (result.shareId + result.path) : '');
    } else {
        console.error('Unknown resource path', resourcePath);
    }

    return result;
}

function getEntryIdentifier(entry) {
    return (entry.share ? (entry.share.id + '/') : '') + entry.filePath;
}

function entryListSort(list, prop, desc) {
    var tmp = list.sort(function (a, b) {
        var av = a[prop];
        var bv = b[prop];

        if (typeof av === 'string') return (av.toUpperCase() < bv.toUpperCase()) ? -1 : 1;
        else return (av < bv) ? -1 : 1;
    });

    if (desc) return tmp;
    return tmp.reverse();
}

export {
    getDirectLink,
    getPreviewUrl,
    getFileTypeGroup,
    prettyDate,
    prettyLongDate,
    prettyFileSize,
    sanitize,
    encode,
    decode,
    getExtension,
    copyToClipboard,
    urlSearchQuery,
    parseResourcePath,
    getEntryIdentifier,
    entryListSort
};
