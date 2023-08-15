
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

      // extension: ""
      // fileName: "Accounting"
      // filePath: "/Accounting"
      // filePathNew: "Accounting"
      // files: Array []
      // id: "SW7qw4MAFnUXq8lfSF8psPwyYYo="
      // isDirectory: true
      // isFile: false
      // isShare: false
      // mimeType: "inode/directory"
      // mtime: "2022-07-23T17:26:43.456Z"
      // owner: "admin"
      // previewUrl: "http://localhost:3000/mime-types/inode-directory.svg"
      // rename: false
      // share: null
      // sharedWith: Array []
      // size: 164720946

      // translate for pankow
      entry.name = entry.fileName;
      entry.folderPath = path.slice(-entry.fileName.length);
      entry.previewUrl = origin + entry.previewUrl;
      entry.fullFileUrl = `${origin}/api/v1/${resource}?path=${entry.filePath}&type=raw`;
      entry.modified = new Date(entry.mtime);
      entry.type = entry.isDirectory ? 'directory' : 'file',
      entry.icon = entry.previewUrl;
      // entry.resourceUrl = `/viewer/${resource}/${this.resourceId}${e.folderPath}/${e.fileName}`;

      // this prepares the entries to be compatible with all components
      entry.files.forEach(child => {
        child.name = child.fileName;
        child.folderPath = entry.folderPath.slice(-child.fileName.length);
        child.previewUrl = origin + child.previewUrl;
        child.fullFileUrl = `${origin}/api/v1/${resource}?path=${child.filePath}&type=raw`;
        child.modified = new Date(child.mtime);
        child.type = child.isDirectory ? 'directory' : 'file',
        child.icon = child.previewUrl;
        child.resourceUrl = '';

        // if we have an image, attach previewUrl
        // if (item.mimeType.indexOf('image/') === 0) {
        //   item.previewUrl = `${origin}/api/v1/${resource}/files/${encodeURIComponent(path + '/' + item.fileName)}`;
        // }
      });

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
    },
    async newFolder(resource, newFolderPath) {
      try {
        await superagent.post(`${origin}/api/v1/${resource}`).withCredentials().query({ path: newFolderPath, directory: true });
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
