
import superagent from 'superagent';
import { sanitize } from 'pankow/utils';
import { parseResourcePath } from '../utils.js';

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
    async get(resource) {
      const result = await superagent.get(`${origin}/api/v1/files`).withCredentials().query({
        type: 'json',
        path: resource.resourcePath
      });

      const entry = result.body;

      // translate for pankow
      entry.name = entry.fileName;
      entry.filePath = entry.filePath || resource.path;
      entry.folderPath = entry.filePath.slice(-entry.fileName.length);
      entry.previewUrl = `${origin}${entry.previewUrl}`;
      entry.modified = new Date(entry.mtime);
      entry.type = entry.isDirectory ? 'directory' : 'file',
      entry.icon = entry.previewUrl;
      entry.resourcePath = resource.resourcePath;
      entry.resource = parseResourcePath(entry.resourcePath);
      entry.fullFileUrl = `${origin}/api/v1/files?path=${entry.resourcePath}&type=raw`;
      entry.downloadFileUrl = `${origin}/api/v1/files?path=${entry.resourcePath}&type=download`;

      // this prepares the entries to be compatible with all components
      entry.files.forEach(child => {
        child.name = child.fileName;
        child.folderPath = entry.folderPath.slice(-child.fileName.length);
        child.previewUrl = `${origin}${child.previewUrl}`;
        child.modified = new Date(child.mtime);
        child.type = child.isDirectory ? 'directory' : 'file',
        child.icon = child.previewUrl;
        child.resourcePath = `${resource.resourcePath}${child.fileName}`;
        child.resource = parseResourcePath(child.resourcePath);
        child.fullFileUrl = `${origin}/api/v1/files?path=${child.resourcePath}&type=raw`;
        child.downloadFileUrl = `${origin}/api/v1/files?path=${child.resourcePath}&type=download`;
      });

      return entry;
    },
    async getRawContent(resource) {
      const result = await superagent.get(`${origin}/api/v1/files`).withCredentials().query({
        type: 'raw',
        path: resource.resourcePath
      });

      return result.text;
    },
    async saveFile(resource, content) {
      const formData = new FormData();
      formData.append('file', new File([ content ], 'file'));

      try {
        await superagent.post(`${origin}/api/v1/files`).withCredentials().query({ path: resource.resourcePath, overwrite: true }).send(formData);
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        else if (error.status === 403) throw new DirectoryModelError(DirectoryModelError.NOT_ALLOWED, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async newFile(resource, newFileName) {
      const formData = new FormData();
      formData.append('file', new Blob());

      const newFilePath = `${resource.resourcePath}/${newFileName}`;

      try {
        await superagent.post(`${origin}/api/v1/files`).withCredentials().query({ path: newFilePath }).send(formData);
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        else if (error.status === 403) throw new DirectoryModelError(DirectoryModelError.NOT_ALLOWED, error);
        else if (error.status === 409) throw new DirectoryModelError(DirectoryModelError.CONFLICT, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async newFolder(resource, newFolderName) {
      const newFolderPath = `${resource.resourcePath}/${newFolderName}`;
      try {
        await superagent.post(`${origin}/api/v1/files`).withCredentials().query({ path: newFolderPath, directory: true });
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        if (error.status === 403) throw new DirectoryModelError(DirectoryModelError.NOT_ALLOWED, error);
        if (error.status === 409) throw new DirectoryModelError(DirectoryModelError.CONFLICT, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async exists(resource, relativeFilePath) {
      try {
        await superagent.head(`${origin}/api/v1/files`).query({ path: resource.resourcePath + '/' + relativeFilePath }).withCredentials();
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        if (error.status === 404) return false;
        else throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }

      return true;
    },
    async upload(resource, file, progressHandler) {
      // file may contain a file name or a file path + file name
      const relativefilePath = (file.webkitRelativePath ? file.webkitRelativePath : file.name);

      // find unique path
      let uniqueRelativeFilePath = sanitize(relativefilePath);
      while (true) {
        const exists = await this.exists(resource, uniqueRelativeFilePath);
        if (!exists) break;

        uniqueRelativeFilePath = uniqueRelativeFilePath + '-new';
      }

      await superagent.post(`${origin}/api/v1/files`).withCredentials()
        .query({ path: resource.resourcePath + '/' + uniqueRelativeFilePath, overwrite: !!file.overwrite })
        .attach('file', file)
        .on('progress', progressHandler);
    },
    async download(resource, files) {
      if (files.length === 1 && !files[0].isDirectory) {
        window.location.href = `${origin}/api/v1/files?type=download&path=${files[0].resourcePath}`;
      } else {
        const params = new URLSearchParams();

        // be a bit smart about the archive name and folder tree
        const folderPath = files[0].filePath.slice(0, -files[0].fileName.length);
        const archiveName = name || folderPath.slice(folderPath.slice(0, -1).lastIndexOf('/')+1).slice(0, -1);
        params.append('name', archiveName);
        params.append('skipPath', folderPath);

        params.append('entries', JSON.stringify(files.map(function (entry) {
            return {
                resourcePath: entry.resourcePath
            };
        })));

        window.location.href = `${origin}/api/v1/download?${params.toString()}`;
      }
    },
    async rename(fromResource, toResource) {
      try {
        await superagent.put(`${origin}/api/v1/files`).query({ path: fromResource.resourcePath, action: 'move', new_path: toResource.resourcePath }).withCredentials();
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        if (error.status === 409) throw new DirectoryModelError(DirectoryModelError.CONFLICT, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async remove(resource) {
      try {
        await superagent.del(`${origin}/api/v1/files`).query({ path: resource.resourcePath }).withCredentials();
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async copy(fromResource, toResource) {
      try {
        await superagent.put(`${origin}/api/v1/files`).query({ path: fromResource.resourcePath, action: 'copy', new_path: toResource.resourcePath }).withCredentials();
      } catch (error) {
        if (error.status === 401) throw new DirectoryModelError(DirectoryModelError.NO_AUTH, error);
        if (error.status === 409) throw new DirectoryModelError(DirectoryModelError.CONFLICT, error);
        throw new DirectoryModelError(DirectoryModelError.GENERIC, error);
      }
    },
    async paste(resource, action, files) {
      // this will not overwrite but tries to find a new unique name to past to
      for (let f in files) {
        let done = false;
        let targetPath = sanitize(resource.resourcePath + '/' + files[f].name);
        while (!done) {
          const targetResource = parseResourcePath(targetPath);
          try {
            if (action === 'cut') await this.rename(files[f].resource, targetResource);
            if (action === 'copy') await this.copy(files[f].resource, targetResource);
            done = true;
          } catch (error) {
            if (error.reason === DirectoryModelError.CONFLICT) {
              targetPath += '-copy';
            } else {
              throw error;
            }
          }
        }
      }
    }
  };
}

export default {
  DirectoryModelError,
  createDirectoryModel
};
