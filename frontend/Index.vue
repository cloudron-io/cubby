<template>
  <input type="file" ref="upload" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>
  <input type="file" ref="uploadFavicon" style="display: none"/>

  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <Login v-show="ready && !profile.username" @success="onLoggedIn"/>

  <div class="container" v-show="ready && profile.username">
    <div class="sidebar">
      <h1 style="margin-bottom: 50px;">Cubby</h1>
      <Button icon="pi pi-folder-open" class="" label="All Files"/>
      <Button icon="pi pi-clock" class="" label="Recent"/>
      <Button icon="pi pi-share-alt" class="" label="Shared"/>
    </div>
    <div class="content">
      <MainToolbar @logout="onLogout"/>
      <div class="container">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entry.files" sort-folders-first="true" @entry-delete="onDelete" @selection-changed="onSelectionChanged" editable/>
        </div>
        <SideBar :entry="activeEntry" :visible="sideBarVisible"/>
      </div>
      <div class="upload">
        <ProgressBar :value="uploadPercent">
          Uploading: {{uploadPercent}}%
        </ProgressBar>
      </div>
    </div>
  </div>

</template>

<script>

import superagent from 'superagent';
import { encode, getPreviewUrl, getExtension } from './utils.js';

function sanitize(path) {
    path = '/' + path;
    return path.replace(/\/+/g, '/');
}

export default {
    name: 'Index',
    data() {
        return {
            ready: false,
            accessToken: '',
            profile: {
                username: '',
                displayName: '',
                email: ''
            },
            uploadPercent: 23,
            error: '',
            entry: {
                files: []
            },
            currentPath: '/',
            activeEntry: {},
            sideBarVisible: true
        };
    },
    methods: {
        onLogout: function () {
            this.accessToken = '';
            this.profile.username = '';
            this.profile.email = '';
            this.profile.displayName = '';

            delete localStorage.accessToken;
        },
        onLoggedIn: function (accessToken, profile) {
            this.accessToken = accessToken;

            this.profile.username = profile.username;
            this.profile.displayName = profile.displayName;
            this.profile.email = profile.email;

            // stash locally
            localStorage.accessToken = accessToken;

            // TODO maybe allow direct entry path
            this.openEntry('/');
        },
        onSelectionChanged: function (selectedEntries) {
            this.activeEntry = selectedEntries[0];
        },
        onToggleSideBar: function () {
            this.sideBarVisible = !this.sideBarVisible;
        },
        onDelete: function (entry) {
            var that = this;

            var filePath = sanitize(that.currentPath + '/' + entry.fileName);

            console.log('==', filePath)

            superagent.del('/api/v1/files').query({ path: filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return that.error('Error deleting file or folder');
                if (error) return that.error(error.message);

                that.openEntry(that.currentPath);
            });
        },
        openEntry: function (filePath) {
            var that = this;

            superagent.get('/api/v1/files').query({ path: filePath, access_token: that.accessToken }).end(function (error, result) {
                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = filePath;

                if (result.body.isDirectory) {
                    result.body.files.forEach(function (entry) {
                        entry.previewUrl = getPreviewUrl(entry, '/');
                        entry.extension = getExtension(entry);
                        entry.rename = false;
                        entry.filePathNew = entry.fileName;
                        entry.filePath = encode(entry.filePath);
                    });
                } else {
                    result.body.files = [];
                }

                that.entry = result.body;
            });
        }
    },
    mounted() {
        var that = this;

        // var dummy = [
        //   {
        //     "isDirectory": true,
        //     "isFile": false,
        //     "atime": "2021-04-15T23:31:42.516Z",
        //     "mtime": "2020-11-18T19:49:55.439Z",
        //     "ctime": "2021-04-13T14:21:09.436Z",
        //     "birthtime": "2020-11-18T19:49:48.347Z",
        //     "size": 4096,
        //     "fileName": "fotos",
        //     "filePath": "/fotos"
        //   },
        //   {
        //     "isDirectory": false,
        //     "isFile": true,
        //     "atime": "2021-04-16T07:01:09.553Z",
        //     "mtime": "2021-03-15T12:43:50.230Z",
        //     "ctime": "2021-04-13T14:21:09.436Z",
        //     "birthtime": "2021-03-15T12:43:50.230Z",
        //     "size": 9,
        //     "fileName": "index.html",
        //     "filePath": "/index.html"
        //   },
        //   {
        //     "isDirectory": false,
        //     "isFile": true,
        //     "atime": "2021-04-16T17:26:19.780Z",
        //     "mtime": "2020-05-26T20:22:59.086Z",
        //     "ctime": "2021-04-13T14:21:09.436Z",
        //     "birthtime": "2020-05-26T20:22:59.078Z",
        //     "size": 220600,
        //     "fileName": "orange.jpg",
        //     "filePath": "/orange.jpg"
        //   },
        // ];

        // this.entries = dummy.map(function (entry) {
        //     entry.previewUrl = getPreviewUrl(entry, '/');
        //     entry.extension = getExtension(entry);
        //     entry.rename = false;
        //     entry.filePathNew = entry.fileName;
        //     entry.filePath = encode(entry.filePath);
        //     return entry;
        // });

        if (!localStorage.accessToken) {
            this.ready = true;
            return;
        }

        that.accessToken = localStorage.accessToken;

        superagent.get('/api/v1/profile').query({ access_token: that.accessToken }).end(function (error, result) {
            if (error) {
                if (error.status !== 401) console.error(error);
                that.ready = true;
                return;
            }

            that.profile.username = result.body.username;
            that.profile.email = result.body.email;
            that.profile.displayName = result.body.displayName;

            that.ready = true;

            that.openEntry('/');
        });
    }
};

</script>

<style>

hr {
    border: none;
    border-top: 1px solid #d0d0d0;
}

label {
    font-weight: bold;
}

.container {
    display: flex;
    width: 100%;
    height: 100%;
}

.sidebar {
    display: flex;
    height: 100%;
    width: 200px;
    background-color: #2196f3;
    color: white;
    padding: 10px;
    flex-direction: column;
}

.content {
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
}

.upload {
    display: flex;
    height: 50px;
    width: 100%;
    padding: 10px;
    flex-direction: column;
}

.p-toast {
    z-index: 2000 !important;
}

.main-container-content {
    position: relative;
}

.side-bar-toggle {
    position: absolute;
    right: 10px;
    top: 10px;
}

</style>
