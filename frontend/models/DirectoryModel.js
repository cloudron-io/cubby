
import superagent from 'superagent';
import { buildFilePath, sanitize } from 'pankow/utils';

const BASE_URL = import.meta.env.BASE_URL || '/';

export function DirectoryModelError(reason, errorOrMessage) {
    Error.call(this);

    this.name = this.constructor.name;
    this.reason = reason;
    this.details = {};

    if (typeof errorOrMessage === 'undefined') {
        this.message = reason;
    } else if (typeof errorOrMessage === 'string') {
        this.message = errorOrMessage;
    } else { // error object
        this.message = errorOrMessage.message;
        this.nestedError = errorOrMessage;
        Object.assign(this); // copy enumerable properies
    }
}

DirectoryModelError.NO_AUTH = 'Not authorized';
DirectoryModelError.NOT_ALLOWED = 'not allowed';
DirectoryModelError.CONFLICT = 'conflict';
DirectoryModelError.GENERIC = 'generic';

DirectoryModelError.prototype.toPlainObject = function () {
    return Object.assign({}, { message: this.message, reason: this.reason }, this.details);
};

export function createDirectoryModel(origin) {
  return {
    name: 'DirectoryModel',
    async get(resource, path) {
      const result = await superagent.get(`${origin}/api/v1/${resource}`).withCredentials().query({
        type: 'json',
        path: path
      });

      const entry = result.body;

      entry.files.forEach(e => {
        e.previewUrl = origin + e.previewUrl;
      });

      // this prepares the entries to be compatible with all components
      // result.body.entries.forEach(item => {
      //   item.id = item.fileName;
      //   item.name = item.fileName;
      //   item.folderPath = path;
      //   item.modified = new Date(item.mtime);
      //   item.type = item.isDirectory ? 'directory' : 'file',
      //   item.icon = `${BASE_URL}mime-types/${item.mimeType === 'inode/symlink' ? 'none' : item.mimeType.split('/').join('-')}.svg`;

      //   // if we have an image, attach previewUrl
      //   if (item.mimeType.indexOf('image/') === 0) {
      //     item.previewUrl = `${origin}/api/v1/${resource}/files/${encodeURIComponent(path + '/' + item.fileName)}`;
      //   }

      //   item.owner = 'unkown';
      //   if (item.uid === 0) item.owner = 'root';
      //   if (item.uid === 33) item.owner = 'www-data';
      //   if (item.uid === 1000) item.owner = 'cloudron';
      //   if (item.uid === 1001) item.owner = 'git';
      // });

      return entry;
    },
    async newFile(resource, newFilePath) {
      const formData = new FormData();
      formData.append('file', new Blob());

      try {
        await superagent.post(`${origin}/api/v1/${resource}`).withCredentials().query({ path: newFilePath }).send(formData);
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        else if (error.status === 403) throw new DirectoryModelError(DirectoryModelError.NOT_ALLOWED, error);
        else if (error.status === 409) throw new DirectoryModelError(DirectoryModelError.CONFLICT, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    }
  };
}

export default {
  DirectoryModelError,
  createDirectoryModel
};
