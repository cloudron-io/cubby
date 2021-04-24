<template>
  <input type="file" ref="upload" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>

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
      <MainToolbar @logout="onLogout" @upload="onUpload" @upload-folder="onUploadFolder"/>
      <div class="container">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entry.files" sort-folders-first="true" @entry-delete="onDelete" @selection-changed="onSelectionChanged" editable/>
        </div>
        <SideBar :entry="activeEntry" :visible="sideBarVisible"/>
      </div>
      <div class="upload" v-show="uploadStatus.busy">
        <div v-show="uploadStatus.uploadListCount">
          <i class="pi pi-spin pi-spinner"></i> Fetching file information for upload <span class="p-badge">{{ uploadStatus.uploadListCount }}</span>
        </div>
        <div style="margin-right: 10px;" v-show="!uploadStatus.uploadListCount">Uploading {{ uploadStatus.count }} files ({{ Math.round(uploadStatus.done/1000/1000) }}MB / {{ Math.round(uploadStatus.size/1000/1000) }}MB)</div>
        <ProgressBar :value="uploadStatus.percentDone" v-show="!uploadStatus.uploadListCount">{{uploadStatus.percentDone}}%</ProgressBar>
      </div>
    </div>
  </div>

</template>

<script>

import superagent from 'superagent';
import { eachLimit } from 'async';
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
            uploadStatus: {
                busy: false,
                count: 0,
                done: 0,
                percentDone: 50,
                uploadListCount: 0
            },
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
        onUpload: function () {
            // reset the form first to make the change handler retrigger even on the same file selected
            this.$refs.upload.value = '';
            this.$refs.upload.click();
        },
        onUploadFolder: function () {
            // reset the form first to make the change handler retrigger even on the same file selected
            this.$refs.uploadFolder.value = '';
            this.$refs.uploadFolder.click();
        },
        onSelectionChanged: function (selectedEntries) {
            this.activeEntry = selectedEntries[0];
        },
        onToggleSideBar: function () {
            this.sideBarVisible = !this.sideBarVisible;
        },
        uploadFiles: function (files, targetPath) {
            var that = this;

            if (!files || !files.length) return;

            targetPath = targetPath || that.currentPath;

            that.uploadStatus.busy = true;
            that.uploadStatus.count = files.length;
            that.uploadStatus.size = 0;
            that.uploadStatus.done = 0;
            that.uploadStatus.percentDone = 0;

            for (var i = 0; i < files.length; ++i) {
                that.uploadStatus.size += files[i].size;
            }

            eachLimit(files, 10, function (file, callback) {
                var path = sanitize(targetPath + '/' + (file.webkitRelativePath || file.name));

                var formData = new FormData();
                formData.append('file', file);

                var finishedUploadSize = 0;

                superagent.post('/api/v1/files')
                  .query({ path: path, access_token: localStorage.accessToken })
                  .send(formData)
                  .on('progress', function (event) {
                    // only handle upload events
                    if (!(event.target instanceof XMLHttpRequestUpload)) return;

                    that.uploadStatus.done += event.loaded - finishedUploadSize;
                    // keep track of progress diff not absolute
                    finishedUploadSize = event.loaded;

                    var tmp = Math.round(that.uploadStatus.done / that.uploadStatus.size * 100);
                    that.uploadStatus.percentDone = tmp > 100 ? 100 : tmp;
                }).end(function (error, result) {
                    if (result && result.statusCode === 401) return that.logout();
                    if (result && result.statusCode !== 201) return callback('Error uploading file: ', result.statusCode);
                    if (error) return callback(error);

                    callback();
                });
            }, function (error) {
                if (error) console.error(error);

                that.uploadStatus.busy = false;
                that.uploadStatus.count = 0;
                that.uploadStatus.size = 0;
                that.uploadStatus.done = 0;
                that.uploadStatus.percentDone = 100;

                that.refresh();
            });
        },
        onDelete: function (entry) {
            var that = this;

            var filePath = sanitize(that.currentPath + '/' + entry.fileName);

            superagent.del('/api/v1/files').query({ path: filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return that.error('Error deleting file or folder');
                if (error) return that.error(error.message);

                that.refresh();
            });
        },
        refresh: function () {
            this.openEntry(this.currentPath);
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

        // upload input event handler
        this.$refs.upload.addEventListener('change', function () {
            that.uploadFiles(that.$refs.upload.files || []);
        });

        this.$refs.uploadFolder.addEventListener('change', function () {
            that.uploadFiles(that.$refs.uploadFolder.files || []);
        });

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
