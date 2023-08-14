
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

      console.log(entry.files)

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

      // this prepares the entries to be compatible with all components
      entry.files.forEach(item => {
        item.name = item.fileName;
        item.folderPath = path;
        item.modified = new Date(item.mtime);
        item.type = item.isDirectory ? 'directory' : 'file',
        item.icon = item.previewUrl;

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
