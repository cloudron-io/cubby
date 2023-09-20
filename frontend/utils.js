
function sanitize(path) {
    path = '/' + path;
    return path.replace(/\/+/g, '/');
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
    sanitize,
    getExtension,
    copyToClipboard,
    urlSearchQuery,
    parseResourcePath,
    getEntryIdentifier,
    entryListSort
};
