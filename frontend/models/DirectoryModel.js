
import superagent from 'superagent';
import { buildFilePath, sanitize } from 'pankow/utils';

const BASE_URL = import.meta.env.BASE_URL || '/';

export function createDirectoryModel(origin, accessToken, api) {

  return {
    name: 'DirectoryModel',
    async listFiles(path) {
      let error, result;
      try {
        result = await superagent.get(`${origin}/api/v1/${api}/files/${path}`).query({ access_token: accessToken });
      } catch (e) {
        error = e;
      }

      if (error || result.statusCode !== 200) {
        if (error.status === 404) return [];

        console.error('Failed to list files', error || result.statusCode);
        return [];
      }

      // this prepares the entries to be compatible with all components
      result.body.entries.forEach(item => {
        item.id = item.fileName;
        item.name = item.fileName;
        item.folderPath = path;
        item.modified = new Date(item.mtime);
        item.type = item.isDirectory ? 'directory' : 'file',
        item.icon = `${BASE_URL}mime-types/${item.mimeType === 'inode/symlink' ? 'none' : item.mimeType.split('/').join('-')}.svg`;

        // if we have an image, attach previewUrl
        if (item.mimeType.indexOf('image/') === 0) {
          item.previewUrl = `${origin}/api/v1/${api}/files/${encodeURIComponent(path + '/' + item.fileName)}?access_token=${accessToken}`;
        }

        item.owner = 'unkown';
        if (item.uid === 0) item.owner = 'root';
        if (item.uid === 33) item.owner = 'www-data';
        if (item.uid === 1000) item.owner = 'cloudron';
        if (item.uid === 1001) item.owner = 'git';
      });

      return result.body.entries;
    },
    async upload(targetDir, file, progressHandler) {
      // file may contain a file name or a file path + file name
      const relativefilePath = (file.webkitRelativePath ? file.webkitRelativePath : file.name);

      await superagent.post(`${origin}/api/v1/${api}/files/${encodeURIComponent(sanitize(targetDir + '/' + relativefilePath))}`)
        .query({ access_token: accessToken })
        .attach('file', file)
        .on('progress', progressHandler);
    },
    async newFile(folderPath, fileName) {
      await superagent.post(`${origin}/api/v1/${api}/files/${folderPath}`)
        .query({ access_token: accessToken })
        .attach('file', new File([], fileName));
    },
    async newFolder(folderPath) {
      await superagent.post(`${origin}/api/v1/${api}/files/${folderPath}`)
        .query({ access_token: accessToken })
        .send({ directory: true });
    },
    async remove(filePath) {
      await superagent.del(`${origin}/api/v1/${api}/files/${filePath}`)
        .query({ access_token: accessToken });
    },
    async rename(fromFilePath, toFilePath) {
      await superagent.put(`${origin}/api/v1/${api}/files/${fromFilePath}`)
        .send({ action: 'rename', newFilePath: sanitize(toFilePath) })
        .query({ access_token: accessToken });
    },
    async copy(fromFilePath, toFilePath) {
      await superagent.put(`${origin}/api/v1/${api}/files/${fromFilePath}`)
        .send({ action: 'copy', newFilePath: sanitize(toFilePath) })
        .query({ access_token: accessToken });
    },
    async chown(filePath, uid) {
      await superagent.put(`${origin}/api/v1/${api}/files/${filePath}`)
        .send({ action: 'chown', uid: uid, recursive: true  })
        .query({ access_token: accessToken });
    },
    async extract(path) {
      await superagent.put(`${origin}/api/v1/${api}/files/${path}`)
        .send({ action: 'extract' })
        .query({ access_token: accessToken });
    },
    async download(path) {
      window.open(`${origin}/api/v1/${api}/files/${path}?download=true&access_token=${accessToken}`);
    },
    async save(filePath, content) {
      const file = new File([content], 'file');
      await superagent.post(`${origin}/api/v1/${api}/files/${filePath}`)
        .query({ access_token: accessToken })
        .attach('file', file)
        .field('overwrite', 'true');
    },
    async getFile(path) {
      let result;
      try {
        result = await fetch(`${origin}/api/v1/${api}/files/${path}?access_token=${accessToken}`);
      } catch (error) {
        console.error('Failed to get file', error);
        return null;
      }

      const text = await result.text();
      return text;
    },
    async paste(targetDir, action, files) {
      // this will not overwrite but tries to find a new unique name to past to
      for (let f in files) {
        let done = false;
        let targetPath = targetDir + '/' + files[f].name;
        while (!done) {
          try {
            if (action === 'cut') await this.rename(buildFilePath(files[f].folderPath, files[f].name), targetPath);
            if (action === 'copy') await this.copy(buildFilePath(files[f].folderPath, files[f].name), targetPath);
            done = true;
          } catch (error) {
            if (error.status === 409) {
              targetPath += '-copy';
            } else {
              throw error;
            }
          }
        }
      }
    },
    getFileUrl(path) {
      return `${origin}/api/v1/${api}/files/${path}?access_token=${accessToken}`;
    }
  };
}

export default {
  createDirectoryModel
};
