
import superagent from 'superagent';
import { buildFilePath, sanitize } from 'pankow/utils';

const BASE_URL = import.meta.env.BASE_URL || '/';

export function createDirectoryModel(origin) {
  return {
    name: 'DirectoryModel',
    async get(resource, path) {
      const result = await superagent.get(`${origin}/api/v1/${resource}`).withCredentials().query({
        type: 'json',
        path: path
      });

      const entry = result.body;

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
  };
}

export default {
  createDirectoryModel
};
