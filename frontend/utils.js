
import filesize from 'filesize';

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
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

function prettyFileSize(value) {
    if (!value) return 'unkown';

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

function getDirectLink(entry) {
    if (entry.share) {
        return window.location.origin + '/api/v1/shares/' + entry.share.id + '?type=raw&access_token=' + localStorage.accessToken;
    } else {
        return window.location.origin + '/api/v1/files?type=raw&access_token=' + localStorage.accessToken + '&path=' + encodeURIComponent(entry.filePath);
    }
}

function download(entry) {
    if (entry.isDirectory) return;
    window.location.href = '/api/v1/files?type=download&access_token=' + localStorage.accessToken + '&path=' + encodeURIComponent(entry.filePath);
}

function getPreviewUrl(entry) {
    if (entry.mimeType === 'inode/recent') return '/folder-temp.svg';
    if (entry.mimeType === 'inode/share') return '/folder-network.svg';

    var mime = entry.mimeType.split('/');
    return '/mime-types/' + mime[0] + '-' + mime[1] + '.svg';
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

function clearSelection() {
    if(document.selection && document.selection.empty) {
        document.selection.empty();
    } else if(window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
}

export {
    getDirectLink,
    getFileTypeGroup,
    prettyDate,
    prettyLongDate,
    prettyFileSize,
    sanitize,
    encode,
    decode,
    download,
    getPreviewUrl,
    getExtension,
    copyToClipboard,
    clearSelection
};
