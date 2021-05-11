<template>
  <input type="file" ref="uploadFile" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>

  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <Login v-show="ready && !profile.username" @success="onLoggedIn"/>

  <div class="container" v-show="ready && profile.username">
    <div class="sidebar">
      <h1 style="margin-bottom: 50px;">Cubby</h1>

      <Button icon="pi pi-folder-open" class="" label="All Files" @click="showAllFiles"/>
      <Button icon="pi pi-clock" class="" label="Recent" @click="onRecent"/>
      <Button icon="pi pi-share-alt" class="" label="Shared" @click="onShares"/>

      <!-- <div style="flex-grow: 1">&nbsp;</div>

      <div class="p-fluid">
        <span class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText type="text" v-model="search" placeholder="Search" />
        </span>
      </div> -->
    </div>
    <div class="content">
      <MainToolbar :currentPath="currentPath" :displayName="profile.displayName" @logout="onLogout" @upload-file="onUploadFile" @upload-folder="onUploadFolder" @new-file="onNewFile" @new-folder="onNewFolder"/>
      <div class="container">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entry.files" sort-folders-first="true" @entry-shared="onShare" @entry-renamed="onRename" @entry-activated="openEntry" @entry-delete="onDelete" @selection-changed="onSelectionChanged" editable/>
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

  <!-- New File Dialog -->
  <Dialog header="New Filename" v-model:visible="newFileDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '350px'}" :modal="true">
    <form @submit="onSaveNewFileDialog" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <InputText type="text" v-model="newFileDialog.fileName" autofocus required :class="{ 'p-invalid': newFileDialog.error }"/>
          <small class="p-invalid" v-show="newFileDialog.error">{{ newFileDialog.error }}</small>
        </div>
      </div>
    </form>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="newFileDialog.visible = false"/>
      <Button label="Create" icon="pi pi-check" class="p-button-text p-button-success" @click="onSaveNewFileDialog" :disabled="!newFileDialog.fileName"/>
    </template>
  </Dialog>

  <!-- New Folder Dialog -->
  <Dialog header="New Foldername" v-model:visible="newFolderDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '350px'}" :modal="true">
    <form @submit="onSaveNewFolderDialog" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <InputText type="text" v-model="newFolderDialog.folderName" autofocus required :class="{ 'p-invalid': newFolderDialog.error }"/>
          <small class="p-invalid" v-show="newFolderDialog.error">{{ newFolderDialog.error }}</small>
        </div>
      </div>
    </form>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="newFolderDialog.visible = false"/>
      <Button label="Create" icon="pi pi-check" class="p-button-text p-button-success" @click="onSaveNewFolderDialog" :disabled="!newFolderDialog.folderName"/>
    </template>
  </Dialog>

  <!-- Share Dialog -->
  <Dialog :header="'Share ' + shareDialog.entry.fileName" v-model:visible="shareDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '500px'}" :modal="true">
    <form @submit="onSaveShareDialog" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <Dropdown v-model="shareDialog.receipientId" :options="shareDialog.users" optionLabel="username" placeholder="Select a user" />
          <small class="p-invalid" v-show="shareDialog.error">{{ shareDialog.error }}</small>
        </div>
      </div>
    </form>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="shareDialog.visible = false"/>
      <Button label="Share" icon="pi pi-check" class="p-button-text p-button-success" @click="onSaveShareDialog" :disabled="!shareDialog.receipientId"/>
    </template>
  </Dialog>

  <ImageViewer ref="imageViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'image'" />
  <TextEditor ref="textEditor" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'text'" />
  <PdfViewer ref="pdfViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'pdf'" />
  <OfficeViewer ref="officeViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'office'" />
</template>

<script>

import superagent from 'superagent';
import { eachLimit } from 'async';
import { encode, getPreviewUrl, getExtension, sanitize, getDirectLink } from './utils.js';

export default {
    name: 'Index',
    data() {
        return {
            ready: false,
            busy: true,
            accessToken: '',
            search: '',
            viewer: '',
            profile: {
                username: '',
                displayName: '',
                email: ''
            },
            viewers: [],
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
            users: [],
            currentPath: '/',
            activeEntry: {},
            sideBarVisible: true,
            newFileDialog: {
                visible: false,
                error: '',
                fileName: ''
            },
            newFolderDialog: {
                visible: false,
                error: '',
                folderName: ''
            },
            shareDialog: {
                visible: false,
                error: '',
                receipientId: '',
                users: [],
                entry: {}
            }
        };
    },
    methods: {
        showAllFiles() {
            window.location.hash = '/';
        },
        onLogout() {
            this.accessToken = '';
            this.profile.username = '';
            this.profile.email = '';
            this.profile.displayName = '';

            delete localStorage.accessToken;
        },
        onLoggedIn(accessToken, profile) {
            this.accessToken = accessToken;

            this.profile.username = profile.username;
            this.profile.displayName = profile.displayName;
            this.profile.email = profile.email;

            // stash locally
            localStorage.accessToken = accessToken;

            this.refresh(window.location.hash.slice(1));
        },
        onSaveShareDialog() {
            console.log('TBD');
        },
        onUploadFile() {
            // reset the form first to make the change handler retrigger even on the same file selected
            this.$refs.uploadFile.value = '';
            this.$refs.uploadFile.click();
        },
        onNewFile() {
            this.newFileDialog.error = '';
            this.newFileDialog.fileName = '';
            this.newFileDialog.visible = true;
        },
        onNewFolder() {
            this.newFolderDialog.error = '';
            this.newFolderDialog.folderName = '';
            this.newFolderDialog.visible = true;
        },
        onSaveNewFileDialog: function () {
            var that = this;

            var path = sanitize(this.currentPath + '/' + this.newFileDialog.fileName);

            var formData = new FormData();
            formData.append('file', new Blob());

            superagent.post('/api/v1/files').query({ path: path, access_token: localStorage.accessToken }).send(formData).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode === 403) return that.newFileDialog.error = 'File name not allowed';
                if (result && result.statusCode === 409) return that.newFileDialog.error = 'File already exists';
                if (result && result.statusCode !== 200) return that.newFileDialog.error = 'Error creating file: ' + result.statusCode;
                if (error) return console.error(error.message);

                that.refresh();

                that.newFileDialog.visible = false;
            });
        },
        onSaveNewFolderDialog: function () {
            var that = this;

            var path = sanitize(this.currentPath + '/' + this.newFolderDialog.folderName);

            superagent.post('/api/v1/files').query({ path: path, access_token: localStorage.accessToken, directory: true }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode === 403) return that.newFolderDialog.error = 'Folder name not allowed';
                if (result && result.statusCode === 409) return that.newFolderDialog.error = 'Folder already exists';
                if (result && result.statusCode !== 200) return that.newFolderDialog.error = 'Error creating folder: ' + result.statusCode;
                if (error) return console.error(error.message);

                that.refresh();

                that.newFolderDialog.visible = false;
            });
        },
        onUploadFolder() {
            // reset the form first to make the change handler retrigger even on the same file selected
            this.$refs.uploadFolder.value = '';
            this.$refs.uploadFolder.click();
        },
        onSelectionChanged(selectedEntries) {
            this.activeEntry = selectedEntries[0];
        },
        onToggleSideBar() {
            this.sideBarVisible = !this.sideBarVisible;
        },
        uploadFiles(files, targetPath) {
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
                    if (result && result.statusCode !== 200) return callback('Error uploading file: ', result.statusCode);
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
        onDelete(entry) {
            var that = this;

            var filePath = sanitize(that.currentPath + '/' + entry.fileName);

            superagent.del('/api/v1/files').query({ path: filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error deleting file or folder');
                if (error) return console.error(error.message);

                that.refresh();
            });
        },
        onRename(entry, newFileName) {
            var that = this;

            var filePath = sanitize(that.currentPath + '/' + entry.fileName);
            var newFilePath = sanitize(that.currentPath + '/' + newFileName);

            superagent.put('/api/v1/files').query({ path: filePath, action: 'move', new_path: newFilePath, access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error moving file or folder');
                if (error) return console.error(error.message);

                that.refresh();
            });
        },
        onRecent() {
            var that = this;

            window.location.hash = 'recent';

            that.busy = true;
            superagent.get('/api/v1/recent').query({ access_token: that.accessToken }).end(function (error, result) {
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = 'recent';

                result.body.files.forEach(function (entry) {
                    entry.previewUrl = getPreviewUrl(entry);
                    entry.extension = getExtension(entry);
                    entry.rename = false;
                    entry.filePathNew = entry.fileName;
                });

                result.body.previewUrl = getPreviewUrl(result.body);

                that.entry = result.body;

                // also set active entry for now maybe wrong
                that.activeEntry = that.entry;
            });
        },
        onShare(entry) {
            var that = this;

            superagent.get('/api/v1/users').query({ access_token: that.accessToken }).end(function (error, result) {
                if (error) return console.error('Failed to get user list.', error);

                that.users = result.body.users;

                that.shareDialog.error = '';
                that.shareDialog.receipientId = '';
                that.shareDialog.entry = entry;
                that.shareDialog.users = that.users.filter(function (u) { return u.username !== that.profile.username; });
                that.shareDialog.visible = true;
            });
        },
        onShares() {
            var that = this;

            window.location.hash = 'shares';

            that.busy = true;
            superagent.get('/api/v1/shares').query({ access_token: that.accessToken }).end(function (error, result) {
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = 'shares';

                result.body.files.forEach(function (entry) {
                    entry.previewUrl = getPreviewUrl(entry);
                    entry.extension = getExtension(entry);
                    entry.rename = false;
                    entry.filePathNew = entry.fileName;
                });

                result.body.previewUrl = getPreviewUrl(result.body);

                that.entry = result.body;

                // also set active entry for now maybe wrong
                that.activeEntry = that.entry;
            });
        },
        refresh(path) {
            var that = this;

            var filePath = path || that.currentPath || '/';

            window.location.hash = filePath;

            that.busy = true;
            superagent.get('/api/v1/files').query({ path: encode(filePath), access_token: that.accessToken }).end(function (error, result) {
                that.busy = false;

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
                        entry.previewUrl = getPreviewUrl(entry);
                        entry.extension = getExtension(entry);
                        entry.rename = false;
                        entry.filePathNew = entry.fileName;
                    });
                } else {
                    result.body.files = [];
                }

                result.body.previewUrl = getPreviewUrl(result.body);

                that.entry = result.body;

                // also set active entry for now maybe wrong
                that.activeEntry = that.entry;
            });
        },
        openEntry(entry) {
            if (entry.isDirectory) return this.refresh(entry.filePath);

            if (this.$refs.imageViewer.canHandle(entry)) {
                this.$refs.imageViewer.open(entry);
                this.viewer = 'image';
            } else if (this.$refs.textEditor.canHandle(entry)) {
                this.$refs.textEditor.open(entry);
                this.viewer = 'text';
            } else if (this.$refs.pdfViewer.canHandle(entry)) {
                this.$refs.pdfViewer.open(entry);
                this.viewer = 'pdf';
            } else if (this.$refs.officeViewer.canHandle(entry)) {
                this.$refs.officeViewer.open(entry);
                this.viewer = 'office';
            } else {
                this.viewer = '';
                console.log('TODO implement viewer');
                window.open(getDirectLink(entry));
            }
        },
        onViewerClose() {
            this.viewer = null;
        }
    },
    mounted() {
        var that = this;

        // upload input event handler
        this.$refs.uploadFile.addEventListener('change', function () {
            that.uploadFiles(that.$refs.uploadFile.files || []);
        });

        this.$refs.uploadFolder.addEventListener('change', function () {
            that.uploadFiles(that.$refs.uploadFolder.files || []);
        });

        function hashChange() {
            const hash = window.location.hash.slice(1);
            if (hash === 'recent') that.onRecent();
            else if (hash === 'shares') that.onShares();
            else that.refresh(hash);
        }

        window.addEventListener('hashchange', hashChange, false);

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

            hashChange();
        });
    }
};

</script>

<style scoped>

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
