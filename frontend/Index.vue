<template>
  <input type="file" ref="uploadFile" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>

  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <Login v-show="ready && !profile.username" @success="onLoggedIn"/>

  <div class="container" v-show="ready && profile.username">
    <div class="sidebar">
      <h1 style="margin-bottom: 50px; padding-left: 15px;">cubby</h1>

      <Button icon="pi pi-folder-open" class="" label="All Files" @click="showAllFiles"/>
      <Button icon="pi pi-clock" class="" label="Recent" @click="showAllRecent"/>
      <Button icon="pi pi-share-alt" class="" label="Shared" @click="showAllShares"/>

      <div style="flex-grow: 1">&nbsp;</div>

      <div class="p-fluid">
        <span><b>{{ prettyFileSize(profile.diskusage.used) }}</b> of <b>{{ prettyFileSize(profile.diskusage.available) }}</b> used</span>
        <ProgressBar class="diskusage" :value="(profile.diskusage.used / profile.diskusage.size) * 100" :showValue="false"/>
      </div>
    </div>
    <div class="content">
      <MainToolbar :currentPath="currentPath" :selectedEntries="selectedEntries" :displayName="profile.displayName" @logout="onLogout" @upload-file="onUploadFile" @upload-folder="onUploadFolder" @new-file="onNewFile" @new-folder="onNewFolder" @delete="onDelete" @download="onDownload"/>
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entry.files" :sort-folders-first="true" :editable="!isShares()"
            @entry-shared="onShare"
            @entry-renamed="onRename"
            @entry-activated="onOpen"
            @delete="onDelete"
            @download="onDownload"
            @selection-changed="onSelectionChanged" />
        </div>
        <SideBar :entry="activeEntry" :visible="sideBarVisible"/>
      </div>
      <div class="upload" v-show="uploadStatus.busy">
        <div style="margin-right: 10px;">Uploading {{ uploadStatus.queue.length+1 }} files ({{ Math.round(uploadStatus.done/1000/1000) }}MB / {{ Math.round(uploadStatus.size/1000/1000) }}MB)</div>
        <ProgressBar :value="uploadStatus.percentDone">{{uploadStatus.percentDone}}%</ProgressBar>
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
    <form @submit="onCreateShare" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <Dropdown v-model="shareDialog.receiverUsername" :options="shareDialog.users" optionDisabled="alreadyUsed" optionValue="username" optionLabel="userAndDisplayName" placeholder="Select a user" />
          <small class="p-invalid" v-show="shareDialog.error">{{ shareDialog.error }}</small>
        </div>
      </div>
      <div class="p-grid p-jc-between">
        <div class="p-col-4">
          <div class="p-field-checkbox">
            <Checkbox id="binary" v-model="shareDialog.readonly" :binary="true" />
            <label for="binary">Share read-only</label>
          </div>
        </div>
        <div class="p-col-4">
          <Button label="Create share" icon="pi pi-check" class="p-button-text p-button-success" @click="onCreateShare" :disabled="!shareDialog.receiverUsername"/>
        </div>
      </div>
    </form>

    <hr/>
    <h3>Shared with</h3>
    <DataTable :value="shareDialog.entry.sharedWith" class="p-datatable-sm" responsiveLayout="scroll">
      <template #empty>
        Not shared with anyone yet
      </template>
      <Column header="User">
        <template #body="slotProps">
          {{ slotProps.data.receiverUsername || slotProps.data.receiverEmail }}
        </template>
      </Column>
      <Column header="Readonly" headerClass="share-readonly-column" :style="{ textAlign: 'center' }">
        <template #body="slotProps">
          <Checkbox v-model="slotProps.data.readonly" :binary="true" readonly/>
        </template>
      </Column>
      <Column header="" :style="{ textAlign: 'right' }">
        <template #body="slotProps">
          <Button class="p-button-sm p-button-rounded p-button-danger p-button-text" icon="pi pi-trash" v-tooltip.top="'Delete'" @click="onDeleteShare(slotProps.data)"/>
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <Button label="Close" icon="pi pi-times" class="p-button-text" @click="shareDialog.visible = false"/>
    </template>
  </Dialog>

  <ImageViewer ref="imageViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'image'" />
  <TextEditor ref="textEditor" :entries="entry.files" @close="onViewerClose" @saved="onFileSaved" v-show="viewer === 'text'" />
  <PdfViewer ref="pdfViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'pdf'" />
  <OfficeViewer ref="officeViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'office'" />
</template>

<script>

import superagent from 'superagent';
import async from 'async';
import { encode, getPreviewUrl, getExtension, sanitize, download, getDirectLink, prettyFileSize } from './utils.js';

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
                email: '',
                diskusage: {
                    used: 0,
                    size: 0,
                    available: 0
                }
            },
            viewers: [],
            uploadStatus: {
                busy: false,
                queue: [],
                done: 0,
                percentDone: 0
            },
            error: '',
            entry: {
                files: []
            },
            selectedEntries: [],
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
                receiverUsername: '',
                readonly: false,
                users: [],
                sharedWith: [],
                entry: {}
            }
        };
    },
    methods: {
        prettyFileSize,
        showAllFiles() {
            window.location.hash = 'files/';
        },
        onLogout() {
            this.accessToken = '';
            this.profile.username = '';
            this.profile.email = '';
            this.profile.displayName = '';
            this.profile.diskusage = {
                used: 0,
                size: 0,
                available: 0
            };

            delete localStorage.accessToken;
        },
        onLoggedIn(accessToken, profile) {
            this.accessToken = accessToken;

            this.profile.username = profile.username;
            this.profile.displayName = profile.displayName;
            this.profile.email = profile.email;
            this.profile.diskusage = profile.diskusage;

            // stash locally
            localStorage.accessToken = accessToken;

            this.loadPath(window.location.hash.slice(1));
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

                that.loadPath();

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

                that.loadPath();

                that.newFolderDialog.visible = false;
            });
        },
        onUploadFolder() {
            // reset the form first to make the change handler retrigger even on the same file selected
            this.$refs.uploadFolder.value = '';
            this.$refs.uploadFolder.click();
        },
        onSelectionChanged(selectedEntries) {
            this.selectedEntries = selectedEntries;

            if (selectedEntries.length) this.activeEntry = selectedEntries[0];
            else this.activeEntry = this.entry; // reset to current folder/view
        },
        onToggleSideBar() {
            this.sideBarVisible = !this.sideBarVisible;
        },
        onFileSaved(entry, content, done) {
            var that = this;

            var formData = new FormData();
            formData.append('file', new File([ content ], 'file'));

            superagent.post('/api/v1/files').query({ path: entry.filePath, access_token: localStorage.accessToken, overwrite: true }).send(formData).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error saving file: ', result.statusCode);
                if (error) return console.error(error);

                if (typeof done === 'function') done();
            });
        },
        uploadNext() {
            var that = this;

            if (that.uploadStatus.queue.length === 0) {
                that.uploadStatus.busy = false;
                that.uploadStatus.size = 0;
                that.uploadStatus.done = 0;
                that.uploadStatus.percentDone = 0;

                return;
            }

            var file = that.uploadStatus.queue.pop();
            var path = sanitize(file.targetPath + '/' + (file.webkitRelativePath || file.name));

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
                if (result && result.statusCode !== 200) console.error('Error uploading file:', result.statusCode);
                if (error) console.error('Error uploading file:', error);

                // TODO maybe smarter refresh
                that.loadPath();

                that.uploadNext();
            });
        },
        uploadFiles(files, targetPath) {
            var that = this;

            if (!files || !files.length) return;

            targetPath = targetPath || that.currentPath;

            that.uploadStatus.busy = true;

            files.forEach(function (file) {
                file.targetPath = targetPath;
                that.uploadStatus.queue.push(file);
                that.uploadStatus.size += file.size;
            });

            this.uploadNext();
        },
        onDownload(entries) {
            if (!entries) entries = this.selectedEntries;

            // TODO use zipping for multiple files
            download(entries[0]);
        },
        onDelete(entries) {
            var that = this;

            if (!entries) entries = this.selectedEntries;

            this.$confirm.require({
                target: event.target,
                header: 'Delete Confirmation',
                message: 'Really delete',
                icon: 'pi pi-exclamation-triangle',
                acceptClass: 'p-button-danger',
                accept: () => {
                    async.eachSeries(entries, function (entry, callback) {
                        var filePath = sanitize(that.currentPath + '/' + entry.fileName);

                        superagent.del('/api/v1/files').query({ path: filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                            if (result && result.statusCode === 401) return that.logout();
                            if (result && result.statusCode !== 200) console.error('Error deleting entry.', entry);
                            if (error) console.error(error.message);

                            // we currently don't fail on first failure
                            callback();
                        });
                    }, function (error) {
                        if (error) console.error('Failed to delete entries.', entries, error);

                        that.loadPath();
                    });
                },
                reject: () => {}
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

                that.loadPath();
            });
        },
        showAllRecent() {
            window.location.hash = 'recent/';
        },
        onRecent() {
            var that = this;

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

                that.currentPath = '/';

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
        showAllShares() {
            window.location.hash = 'shares/';
        },
        isShares() {
            return window.location.hash.slice(1).startsWith('shares/');
        },
        onShare(entry) {
            var that = this;

            that.shareDialog.error = '';
            that.shareDialog.receiverUsername = '';
            that.shareDialog.readonly = false;
            that.shareDialog.entry = entry;

            superagent.get('/api/v1/users').query({ access_token: that.accessToken }).end(function (error, result) {
                if (error) return console.error('Failed to get user list.', error);

                that.shareDialog.users = result.body.users.filter(function (u) { return u.username !== that.profile.username; });

                that.shareDialog.users.forEach(function (user) {
                    if (entry.sharedWith.find(function (share) { return share.receiverUsername === user.username; })) user.alreadyUsed = true;
                });

                // TODO this is just to be prettier, should be in UI code though
                that.shareDialog.users.forEach(function (u) {
                    u.userAndDisplayName = u.displayName + ' ( ' + u.username + ' )';
                });

                that.shareDialog.visible = true;
            });
        },
        onCreateShare() {
            var that = this;

            var path = this.shareDialog.entry.filePath;
            var readonly = this.shareDialog.readonly;
            var receiver_username = this.shareDialog.receiverUsername;

            superagent.post('/api/v1/shares').query({ path, readonly, receiver_username, access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode !== 200) return that.shareDialog.error = 'Error creating share: ' + result.statusCode;
                if (error) return console.error(error.message);

                // reset the form
                that.shareDialog.error = '';
                that.shareDialog.receiverUsername = '';
                that.shareDialog.readonly = false;

                superagent.get('/api/v1/files').query({ path: that.shareDialog.entry.filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                    if (result && result.statusCode === 401) return that.logout();
                    if (result && result.statusCode !== 200) return console.error('Error getting file or folder');
                    if (error) return console.error(error.message);

                    that.shareDialog.entry = result.body;

                    that.loadPath();
                });
            });
        },
        onDeleteShare(share) {
            var that = this;

            superagent.delete('/api/v1/shares/' + share.id).query({ access_token: localStorage.accessToken }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error deleting share');
                if (error) return console.error(error.message);

                superagent.get('/api/v1/files').query({ path: that.shareDialog.entry.filePath, access_token: localStorage.accessToken }).end(function (error, result) {
                    if (result && result.statusCode === 401) return that.logout();
                    if (result && result.statusCode !== 200) return console.error('Error getting file or folder');
                    if (error) return console.error(error.message);

                    that.shareDialog.entry = result.body;

                    that.loadPath();
                });
            });
        },
        onShares() {
            var that = this;
            const hash = window.location.hash.slice(1);

            if (hash.indexOf('shares/') !== 0) return console.error('invalid call for this URI');

            const shareId = hash.slice('shares/'.length).split('/')[0] || '';
            const filePath = hash.slice(`shares/${shareId}`.length) || '/';

            that.busy = true;
            superagent.get('/api/v1/shares/' + shareId).query({ access_token: that.accessToken, path: filePath }).end(function (error, result) {
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 403) that.error = 'Not allowed';
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = '/' + result.body.owner + filePath;

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
        onFiles() {
            const hash = window.location.hash.slice(1);

            if (hash.indexOf('files/') !== 0) return console.error('invalid call for this URI');

            this.loadPath(hash.slice('files'.length));
        },
        loadPath(path) {
            var that = this;

            // FIXME rework this to not make the listview flicker that much

            var filePath = path || that.currentPath || '/';

            window.location.hash = 'files' + filePath;

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
        openDirectory(entry) {
            if (entry.share && entry.share.id) window.location.hash = 'shares/' + entry.share.id + entry.filePath;
            else window.location.hash = 'files' + entry.filePath;
        },
        onOpen(entry) {
            if (entry.isDirectory) return this.openDirectory(entry);

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

            if (hash.indexOf('files/') === 0) that.onFiles();
            else if (hash.indexOf('recent/') === 0) that.onRecent();
            else if (hash.indexOf('shares/') === 0) that.onShares();
            else window.location.hash = 'files/';
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
            that.profile.diskusage = result.body.diskusage;

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
    width: 250px;
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

<style>

.diskusage.p-progressbar {
    height: 10px;
    margin-top: 5px;
}

.diskusage.p-progressbar .p-progressbar-value {
    background: #fecb3e !important;
}

.share-readonly-column .p-column-title {
    text-align: center;
    width: 100%;
}

</style>
