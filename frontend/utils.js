
import filesize from 'filesize';

function prettyDate(value) {
    var date = new Date(value),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0)
        return;

    return day_diff === 0 && (
        diff < 60 && 'just now' ||
        diff < 120 && '1 minute ago' ||
        diff < 3600 && Math.floor( diff / 60 ) + ' minutes ago' ||
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
    return '/api/v1/files?type=raw&access_token=' + localStorage.accessToken + '&path=' + encodeURIComponent(entry.filePath);
}

function download(entry) {
    if (entry.isDirectory) return;
    window.location.href = '/api/v1/files?type=download&access_token=' + localStorage.accessToken + '&path=' + encodeURIComponent(entry.filePath);
}

const FILE_TYPES = {
    unknown: 'unknown',
    directory: 'directory',
    image: 'image',
    text: 'text',
    pdf: 'pdf',
    html: 'html',
    music: 'music',
    video: 'video'
};

const MIME_TYPES = {
    image: [ '.png', '.jpg', '.jpeg', '.tiff', '.gif' ],
    text: [ '.txt', '.md' ],
    pdf: [ '.pdf' ],
    html: [ '.html', '.htm', '.php' ],
    music: [ '.mp2', '.mp3', '.ogg', '.flac', '.wav', '.aac' ],
    video: [ '.mp4', '.mpg', '.mpeg', '.mkv', '.avi', '.mov' ]
};

function getPreviewUrl(entry) {
    // var path = '/mime-types/';

    // if (entry.isDirectory) return path + 'directory.png';

    // if (MIME_TYPES.image.some(function (e) { return entry.fileName.endsWith(e); })) return path +'image.png';
    // if (MIME_TYPES.text.some(function (e) { return entry.fileName.endsWith(e); })) return path +'text.png';
    // if (MIME_TYPES.pdf.some(function (e) { return entry.fileName.endsWith(e); })) return path + 'pdf.png';
    // if (MIME_TYPES.html.some(function (e) { return entry.fileName.endsWith(e); })) return path + 'html.png';
    // if (MIME_TYPES.music.some(function (e) { return entry.fileName.endsWith(e); })) return path + 'music.png';
    // if (MIME_TYPES.video.some(function (e) { return entry.fileName.endsWith(e); })) return path + 'video.png';

    var mime = entry.mimeType.split('/');
    console.log(entry.mimeType)

    return '/mime-types/' + mime[0] + '-' + mime[1] + '.svg';
}

function getFileType(entry) {
    if (entry.isDirectory) return FILE_TYPES.directory;

    const mimeType = Object.keys(MIME_TYPES).find(function (type) {
        return MIME_TYPES[type].some(function (e) { return entry.fileName.endsWith(e); });
    });

    if (mimeType) return FILE_TYPES[mimeType];

    return FILE_TYPES.unknown;
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

export {
    FILE_TYPES,
    getDirectLink,
    getFileType,
    prettyDate,
    prettyLongDate,
    prettyFileSize,
    sanitize,
    encode,
    decode,
    download,
    getPreviewUrl,
    getExtension,
    copyToClipboard
};
