<template>
  <input type="file" ref="uploadFile" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>

  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <Login v-show="ready && !profile.username" @success="onLoggedIn"/>

  <div class="container" v-show="ready && profile.username">
    <div class="sidebar">
      <h1 style="margin-bottom: 50px; text-align: center;"><img src="/logo.png" height="60" width="60"/><br/>Cubby</h1>

      <Button icon="pi pi-folder-open" class="p-button-text p-button-primary" label="All Files" @click="showAllFiles"/>
      <Button icon="pi pi-clock" class="p-button-text p-button-primary" label="Recent Files" @click="showAllRecent"/>
      <Button icon="pi pi-share-alt" class="p-button-text p-button-primary" label="Shared With You" @click="showAllShares"/>

      <div style="flex-grow: 1">&nbsp;</div>

      <div class="p-fluid" v-tooltip.top="prettyFileSize(profile.diskusage.used) + ' of ' + prettyFileSize(profile.diskusage.available)">
        <span>
          <b>{{ parseInt(profile.diskusage.used / profile.diskusage.available * 100) }}%</b> of storage used
        </span>
        <ProgressBar class="diskusage" :value="(profile.diskusage.used / profile.diskusage.size) * 100" :showValue="false"/>
      </div>
    </div>
    <div class="content">
      <MainToolbar :breadCrumbs="breadCrumbs" :breadCrumbHome="breadCrumbHome" :selectedEntries="selectedEntries" :displayName="profile.displayName" @logout="onLogout" @upload-file="onUploadFile" @upload-folder="onUploadFolder" @new-file="onNewFile" @directory-up="onUp" @new-folder="onNewFolder" @delete="onDelete" @download="onDownload"/>
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entries" :sort-folders-first="true" :editable="!isReadonly()" :shareable="isShareable()" :active="viewer === ''"
            @entry-shared="onShare"
            @entry-renamed="onRename"
            @entry-activated="onOpen"
            @delete="onDelete"
            @download="onDownload"
            @selection-changed="onSelectionChanged"
            @dropped="onDrop"
          />
        </div>
        <SideBar :selectedEntries="selectedEntries" :visible="sideBarVisible"/>
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

  <!-- Conflicting Files Dialog -->
  <Dialog header="Conflicting file or folder" v-model:visible="conflictingFileDialog.visible" :dismissableMask="false" :closable="false" :style="{width: '550px'}" :modal="true">
    <h3 style="margin-top: 0;"><i>{{ conflictingFileDialog.path }}</i></h3>
    <template #footer>
      <Button label="Overwrite" icon="pi pi-check" class="p-button-text p-button-danger" @click="onSubmitConflictingFileDialog('overwrite')"/>
      <Button label="Overwrite All" icon="pi pi-check-circle" class="p-button-text p-button-danger" @click="onSubmitConflictingFileDialog('overwriteAll')"/>
      <Button label="Skip" icon="pi pi-times" class="p-button-text" @click="onSubmitConflictingFileDialog('skip')"/>
      <Button label="Skip All" icon="pi pi-times-circle" class="p-button-text" @click="onSubmitConflictingFileDialog('skipAll')"/>
    </template>
  </Dialog>

  <!-- Share Dialog -->
  <Dialog :header="shareDialog.entry.fileName" v-model:visible="shareDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '550px'}" :modal="true">
    <h3 style="margin-top: 0;">Share Link</h3>
    <div class="p-formgroup-inline">
      <div class="p-field-checkbox">
        <Checkbox id="expireShareLinkAt" v-model="shareDialog.shareLink.expire" :binary="true" />
        <label for="expireShareLinkAt">Expire At</label>
      </div>
      <div class="p-field">
        <Calendar v-model="shareDialog.shareLink.expiresAt" :minDate="new Date()" :disabled="!shareDialog.shareLink.expire"/>
      </div>
      <Button label="Create and Copy Link" icon="pi pi-link" class="p-button p-button-success" @click="onCreateShareLink"/>
    </div>

    <h3>Create Share</h3>
    <form @submit="onCreateShare" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <Dropdown v-model="shareDialog.receiverUsername" :options="shareDialog.users" optionDisabled="alreadyUsed" optionValue="username" optionLabel="userAndDisplayName" placeholder="Select a user" />
          <small class="p-invalid" v-show="shareDialog.error">{{ shareDialog.error }}</small>
        </div>
      </div>
      <div>
        <div class="p-field-checkbox">
          <Checkbox id="binary" v-model="shareDialog.readonly" :binary="true" />
          <label for="binary">Share read-only</label>
        </div>
        <Button label="Create share" icon="pi pi-check" class="p-button p-button-success" @click="onCreateShare" :disabled="!shareDialog.receiverUsername"/>
      </div>
    </form>

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

  <div class="viewer-container" v-show="viewer">
    <ImageViewer ref="imageViewer" @close="onViewerClose" @download="onDownload" v-show="viewer === 'image'" />
    <TextEditor ref="textEditor" @close="onViewerClose" @saved="onFileSaved" v-show="viewer === 'text'" />
    <!-- <PdfViewer ref="pdfViewer" @close="onViewerClose" v-show="viewer === 'pdf'" /> -->
    <!-- <OfficeViewer ref="officeViewer" :config="config.viewers.collabora" @close="onViewerClose" v-show="viewer === 'office'" /> -->
    <GenericViewer ref="genericViewer" @close="onViewerClose" v-show="viewer === 'generic'" />
  </div>
</template>

<script>

'use strict';

import superagent from 'superagent';
import async from 'async';
import { parseResourcePath, decode, getExtension, getShareLink, copyToClipboard, sanitize, download, getDirectLink, prettyFileSize } from './utils.js';

export default {
    name: 'Index',
    data() {
        return {
            ready: false,
            busy: true,
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
            config: {
                viewers: {
                    collabora: {}
                }
            },
            viewers: [],
            uploadStatus: {
                busy: false,
                queue: [],
                done: 0,
                size: 0,
                percentDone: 0
            },
            error: '',
            entries: [],
            selectedEntries: [],
            currentPath: '/',
            currentResourcePath: 'files/',
            currentShare: null,
            sideBarVisible: true,
            breadCrumbs: [],
            breadCrumbHome: {
                icon: 'pi pi-home',
                url: '#files'
            },
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
            conflictingFileDialog: {
                visible: false,
                path: '',
                file: null
            },
            shareDialog: {
                visible: false,
                error: '',
                receiverUsername: '',
                readonly: false,
                users: [],
                sharedWith: [],
                entry: {},
                shareLink: {
                    expire: false,
                    expiresAt: 0
                }
            }
        };
    },
    methods: {
        prettyFileSize,
        showAllFiles() {
            window.location.hash = 'files/';
        },
        onLogout() {
            var that = this;

            superagent.get('/api/v1/logout').end(function (error) {
                if (error) return console.error(error.message);

                that.profile.username = '';
                that.profile.email = '';
                that.profile.displayName = '';
                that.profile.diskusage = {
                    used: 0,
                    size: 0,
                    available: 0
                };
            });
        },
        onLoggedIn(profile) {
            var that = this;

            this.profile.username = profile.username;
            this.profile.displayName = profile.displayName;
            this.profile.email = profile.email;
            this.profile.diskusage = profile.diskusage;

            this.refreshConfig(function (error) {
                if (error) return console.error('Failed to load config.', error);
                that.loadPath(window.location.hash.slice(1), true);
            });
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
        onSaveNewFileDialog() {
            var that = this;

            var path = sanitize(this.currentPath + '/' + this.newFileDialog.fileName);

            var formData = new FormData();
            formData.append('file', new Blob());

            superagent.post('/api/v1/files').query({ path: path }).send(formData).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode === 403) return that.newFileDialog.error = 'File name not allowed';
                if (result && result.statusCode === 409) return that.newFileDialog.error = 'File already exists';
                if (result && result.statusCode !== 200) return that.newFileDialog.error = 'Error creating file: ' + result.statusCode;
                if (error) return console.error(error.message);

                that.refresh();

                that.newFileDialog.visible = false;
            });
        },
        onSaveNewFolderDialog() {
            var that = this;

            var path = sanitize(this.currentPath + '/' + this.newFolderDialog.folderName);

            superagent.post('/api/v1/files').query({ path: path, directory: true }).end(function (error, result) {
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
            this.selectedEntries = selectedEntries;
        },
        onToggleSideBar() {
            this.sideBarVisible = !this.sideBarVisible;
        },
        onFileSaved(entry, content, done) {
            var that = this;

            var formData = new FormData();
            formData.append('file', new File([ content ], 'file'));

            superagent.post('/api/v1/files').query({ path: entry.filePath, overwrite: true }).send(formData).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error saving file: ', result.statusCode);
                if (error) return console.error(error);

                if (typeof done === 'function') done();
            });
        },
        clearSelection() {
          this.selectedEntries = [];
        },
        uploadFile(file, fullTargetPath, callback) {
            var that = this;

            if (file.skip) {
                // FIXME maybe refactor this calculation
                that.uploadStatus.done += file.size;
                var tmp = Math.round(that.uploadStatus.done / that.uploadStatus.size * 100);
                that.uploadStatus.percentDone = tmp > 100 ? 100 : tmp;

                return callback();
            }

            var formData = new FormData();
            formData.append('file', file);

            var finishedUploadSize = 0;

            superagent.post(file.apiPath)
              .query({ path: fullTargetPath, overwrite: !!file.overwrite })
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

                callback();
            });
        },
        uploadNext() {
            var that = this;

            if (that.uploadStatus.queue.length === 0) {
                that.uploadStatus.busy = false;
                that.uploadStatus.size = 0;
                that.uploadStatus.done = 0;
                that.uploadStatus.percentDone = 0;

                that.refresh();

                return;
            }

            that.uploadStatus.busy = true;

            var file = that.uploadStatus.queue.pop();
            var resource = parseResourcePath(file.targetPath);
            var fullTargetPath = sanitize(resource.path + '/' + (file.webkitRelativePath || file.name));

            // amend info for uploadFile
            file.apiType = resource.type;
            file.apiPath = resource.apiPath;
            file.shareId = resource.shareId;

            // check first for conflict to avoid double upload
            superagent.head(resource.apiPath).query({ path: fullTargetPath }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();

                // This stops the uploadNext flow waiting for user input
                if (result && result.statusCode === 200) {
                    if (file.skip) {
                        // FIXME maybe refactor this calculation
                        that.uploadStatus.done += file.size;
                        var tmp = Math.round(that.uploadStatus.done / that.uploadStatus.size * 100);
                        that.uploadStatus.percentDone = tmp > 100 ? 100 : tmp;

                        that.uploadNext();
                    } else if (file.overwrite) {
                        that.uploadFile(file, fullTargetPath, function (error) {
                            if (error) return console.error(error);
                            that.uploadNext();
                        });
                    } else {
                        // FIXME: check why we need the timeout to give UI a chance to update
                        setTimeout(function () { that.showConflictingFileDialog(file, fullTargetPath); }, 1000);
                    }
                    return;
                }

                if (error && error.status !== 404) console.error(error.message);

                that.uploadFile(file, fullTargetPath, function (error) {
                    if (error) return console.error(error);

                    that.uploadNext();
                });
            });
        },
        showConflictingFileDialog(file, path) {
            this.conflictingFileDialog.file = file;
            this.conflictingFileDialog.path = path;
            this.conflictingFileDialog.visible = true;
        },
        onSubmitConflictingFileDialog(action) {
            var that = this;

            if (action === 'skip') {
                this.conflictingFileDialog.file.skip = true;
            } else if (action === 'skipAll') {
                this.conflictingFileDialog.file.skip = true;
                this.uploadStatus.queue.forEach(function (file) { file.skip = true; });
            } else if (action === 'overwrite') {
                this.conflictingFileDialog.file.overwrite = true;
            } else if (action === 'overwriteAll') {
                this.conflictingFileDialog.file.overwrite = true;
                this.uploadStatus.queue.forEach(function (file) { file.overwrite = true; });
            } else {
                console.error('This should never happen');
            }

            this.conflictingFileDialog.visible = false;

            that.uploadFile(this.conflictingFileDialog.file, this.conflictingFileDialog.path, function (error) {
                if (error) return console.error(error);

                that.conflictingFileDialog.file = null;
                that.conflictingFileDialog.path = '';

                // continue
                that.uploadNext();
            });
        },
        uploadFiles(files, targetPath) {
            var that = this;

            if (!files || !files.length) return;

            targetPath = targetPath || that.currentResourcePath;

            // convert from FileList to Array and amend useful properties
            files = Array.from(files).map(function (file) {
                file.targetPath = targetPath;
                return file;
            });

            // now collect stats for progress
            files.forEach(function (file) {
                that.uploadStatus.queue.push(file);
                that.uploadStatus.size += file.size;
            });

            that.uploadNext();
        },
        onDownload(entries) {
            if (!entries) entries = this.selectedEntries;

            // use the
            download(entries, this.currentShare ? this.currentShare.filePath.slice(1) : '');
        },
        onDrop(items, targetEntry) {
            var that = this;

            if (items.length === 0) return;

            const list = [];
            for (let i = 0; i < items.length; i++) list.push(items[i]);

            // figure if a folder was dropped on a modern browser, in this case the first would have to be a directory
            var folderItem;
            var targetPath = targetEntry ? (that.currentResourcePath + targetEntry.filePath) : null;
            try {
                folderItem = list[0].webkitGetAsEntry();
                if (folderItem.isFile) return that.uploadFiles(list.map(function (item) { return item.getAsFile(); }), targetPath);
            } catch (e) {
                return that.uploadFiles(list.map(function (item) { return item.getAsFile(); }), targetPath);
            }

            // if we got here we have a folder drop and a modern browser
            // now traverse the folder tree and create a file list
            const files = [];
            function traverseFileTree(item, path, callback) {
                if (item.isFile) {
                    // Get file
                    item.file(function (file) {
                        files.push(file);
                        callback();
                    });
                } else if (item.isDirectory) {
                    // Get folder contents
                    var dirReader = item.createReader();
                    dirReader.readEntries(function (entries) {
                        async.each(entries, function (entry, callback) {
                            traverseFileTree(entry, path + item.name + '/', callback);
                        }, callback);
                    });
                }
            }

            traverseFileTree(folderItem, '', function (error) {
                if (error) return console.error(error);

                that.uploadFiles(files, targetPath);
            });
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
                        var resource = parseResourcePath(that.currentResourcePath + '/' + entry.fileName);

                        superagent.del(resource.apiPath).query({ path: resource.path }).end(function (error, result) {
                            if (result && result.statusCode === 401) return that.logout();
                            if (result && result.statusCode !== 200) console.error('Error deleting entry.', entry);
                            if (error) console.error(error.message);

                            // we currently don't fail on first failure
                            callback();
                        });
                    }, function (error) {
                        if (error) console.error('Failed to delete entries.', entries, error);

                        that.refresh();
                    });
                },
                reject: () => {}
            });
        },
        onRename(entry, newFileName) {
            var that = this;

            var resource = parseResourcePath(that.currentResourcePath + '/' + entry.fileName);
            var newResource = parseResourcePath(that.currentResourcePath + '/' + newFileName);

            superagent.put(resource.apiPath).query({ path: resource.path, action: 'move', new_path: newResource.path }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error moving file or folder');
                if (error) return console.error(error.message);

                that.refresh();
            });
        },
        showAllRecent() {
            window.location.hash = 'recent/';
        },
        onRecent() {
            var that = this;

            this.clearSelection();

            that.busy = true;
            superagent.get('/api/v1/recent').end(function (error, result) {
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = '/';
                that.currentResourcePath = 'recent/';
                that.breadCrumbs = [];
                that.breadCrumbHome = {
                    icon: 'pi pi-clock',
                    url: '#recent/'
                };

                result.body.files.forEach(function (entry) {
                    entry.extension = getExtension(entry);
                    entry.rename = false;
                    entry.filePathNew = entry.fileName;
                });

                that.entries = result.body.files;
            });
        },
        showAllShares() {
            window.location.hash = 'shares/';
        },
        isReadonly() {
            if (window.location.hash === '/shares/') return true;
            if (!this.currentShare) return false;
            return this.currentShare.readonly;
        },
        isShareable() {
            var resource = parseResourcePath(this.currentResourcePath || 'files/');
            return resource.type !== 'shares';
        },
        onShare(entry) {
            var that = this;

            that.shareDialog.error = '';
            that.shareDialog.receiverUsername = '';
            that.shareDialog.readonly = false;
            that.shareDialog.entry = entry;
            that.shareDialog.shareLink.expires = false;
            that.shareDialog.shareLink.expiresAt = new Date();

            // start with tomorrow
            that.shareDialog.shareLink.expiresAt.setDate(that.shareDialog.shareLink.expiresAt.getDate() + 1);

            superagent.get('/api/v1/users').end(function (error, result) {
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
        onCreateShareLink() {
            var that = this;

            var path = this.shareDialog.entry.filePath;
            var readonly = true; // always readonly for now
            var expires_at = this.shareDialog.shareLink.expires ? this.shareDialog.shareLink.expiresAt : 0;

            superagent.post('/api/v1/shares').query({ path, readonly, expires_at }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode !== 200) return that.shareDialog.error = 'Error creating link share: ' + result.statusCode;
                if (error) return console.error(error.message);

                copyToClipboard(getShareLink(result.body.shareId));

                that.shareDialog.visible = false;

                that.$toast.add({ severity:'success', summary: 'Share link copied to clipboard', life: 2000 });
            });
        },
        onCreateShare() {
            var that = this;

            var path = this.shareDialog.entry.filePath;
            var readonly = this.shareDialog.readonly;
            var receiver_username = this.shareDialog.receiverUsername;

            superagent.post('/api/v1/shares').query({ path, readonly, receiver_username }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.onLogout();
                if (result && result.statusCode !== 200) return that.shareDialog.error = 'Error creating share: ' + result.statusCode;
                if (error) return console.error(error.message);

                // reset the form
                that.shareDialog.error = '';
                that.shareDialog.receiverUsername = '';
                that.shareDialog.readonly = false;

                superagent.get('/api/v1/files').query({ path: that.shareDialog.entry.filePath }).end(function (error, result) {
                    if (result && result.statusCode === 401) return that.logout();
                    if (result && result.statusCode !== 200) return console.error('Error getting file or folder');
                    if (error) return console.error(error.message);

                    that.shareDialog.entry = result.body;

                    that.refresh();
                });
            });
        },
        onDeleteShare(share) {
            var that = this;

            superagent.delete('/api/v1/shares').query({ share_id: share.id }).end(function (error, result) {
                if (result && result.statusCode === 401) return that.logout();
                if (result && result.statusCode !== 200) return console.error('Error deleting share');
                if (error) return console.error(error.message);

                superagent.get('/api/v1/files').query({ path: that.shareDialog.entry.filePath }).end(function (error, result) {
                    if (result && result.statusCode === 401) return that.logout();
                    if (result && result.statusCode !== 200) return console.error('Error getting file or folder');
                    if (error) return console.error(error.message);

                    that.shareDialog.entry = result.body;

                    that.refresh();
                });
            });
        },
        refresh() {
            this.loadPath(null, true);
        },
        loadPath(path, alwaysRefresh) {
            var that = this;

            // FIXME rework this to not make the listview flicker that much
            var resource = parseResourcePath(path || that.currentResourcePath || 'files/');

            // check if we actually have a new path to fetch
            var currentResource = null;
            if (!alwaysRefresh && that.currentResourcePath) {
                currentResource = parseResourcePath(that.currentResourcePath);

                if (currentResource.resourcePath === resource.resourcePath) return;
            }

            // only show busy state if it takes more than 2 seconds to avoid flickering
            var busyTimer = setTimeout(function () { that.busy = true; }, 2000);

            superagent.get(resource.apiPath).query({ path: resource.path }).end(function (error, result) {
                clearTimeout(busyTimer);
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 401) that.onLogout();
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                const entry = result.body;

                // update the browser hash
                window.location.hash = resource.resourcePath;

                if (entry.isDirectory) {
                    that.currentPath = resource.path;
                    that.currentResourcePath = resource.resourcePath;
                    that.currentShare = entry.share || null;

                    if (resource.type === 'files') {
                        that.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
                            return {
                                label: decode(e),
                                url: '#files' + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
                            };
                        });
                        that.breadCrumbHome = {
                            icon: 'pi pi-home',
                            url: '#files/'
                        };
                    } else if (resource.type === 'shares') {
                        that.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
                            return {
                                label: decode(e),
                                url: '#shares/' + resource.shareId  + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
                            };
                        });
                        that.breadCrumbHome = {
                            icon: 'pi pi-share-alt',
                            url: '#shares/'
                        };

                        // if we are not toplevel, add the share information
                        if (result.body.share) {
                            that.breadCrumbs.unshift({
                                label: entry.share.filePath.slice(1), // remove slash at the beginning
                                url: '#shares/' + resource.shareId + '/'
                            });
                        }
                    } else {
                        console.error('FIXME breadcrumbs for resource type', resource.type);
                    }

                    entry.files.forEach(function (e) {
                        e.extension = getExtension(e);
                        e.rename = false;
                        e.filePathNew = e.fileName;
                    });

                    that.entries = entry.files;
                    that.viewer = '';

                    that.clearSelection();
                } else {
                    if (that.$refs.imageViewer.canHandle(entry)) {
                        that.$refs.imageViewer.open(entry);
                        that.viewer = 'image';
                    } else if (that.$refs.textEditor.canHandle(entry)) {
                        that.$refs.textEditor.open(entry);
                        that.viewer = 'text';
                    } else if (that.$refs.pdfViewer.canHandle(entry)) {
                        that.$refs.pdfViewer.open(entry);
                        that.viewer = 'pdf';
                    } else if (that.$refs.officeViewer.canHandle(entry)) {
                        that.$refs.officeViewer.open(entry);
                        that.viewer = 'office';
                    } else {
                        that.viewer = 'generic';
                        that.$refs.genericViewer.open(entry);
                    }
                }
            });
        },
        onOpen(entry) {
            if (entry.share && entry.share.id) window.location.hash = 'shares/' + entry.share.id + '/' + entry.filePath;
            else window.location.hash = 'files' + entry.filePath;
        },
        onViewerClose() {
            this.viewer = '';

            // update the browser hash
            const resource = parseResourcePath(this.currentResourcePath || 'files/');
            window.location.hash = resource.resourcePath;
        },
        onUp() {
            if (window.location.hash.indexOf('#shares/') === 0) {
                const hash = window.location.hash.slice('#shares/'.length);

                // if we are first level of that share, go back to all shares
                if (!hash.split('/')[1]) window.location.hash = 'shares/';
                else window.location.hash = hash.split('/')[0] + sanitize(hash.split('/').slice(1, -1).filter(function (p) { return !!p; }).join('/'));
            } else {
                const hash = window.location.hash.slice(1);
                window.location.hash = hash.split('/')[0] + sanitize(hash.split('/').slice(1, -1).filter(function (p) { return !!p; }).join('/'));
            }
        },
        refreshConfig(callback) {
            var that = this;

            superagent.get('/api/v1/config').end(function (error, result) {
                if (error) return callback(error);

                // ensure we know what we get so we can properly reference
                that.config.viewers.collabora = result.body.viewers.collabora || {};

                callback();
            });
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

            if (hash.indexOf('files/') === 0) that.loadPath(hash);
            else if (hash.indexOf('recent/') === 0) that.onRecent();
            else if (hash.indexOf('shares/') === 0) that.loadPath(hash);
            else window.location.hash = 'files/';
        }

        window.addEventListener('hashchange', hashChange, false);

        // warn the user if uploads are still in progress
        window.addEventListener('beforeunload', function (event) {
            if (!that.uploadStatus.busy) return;

            event.preventDefault();
            window.confirm('Uploads are still in progress. Please wait for them to finish.');
        }, { capture: true });

        superagent.get('/api/v1/profile').end(function (error, result) {
            if (error) {
                if (error.status !== 401) console.error(error);
                that.ready = true;
                return;
            }

            that.profile.username = result.body.username;
            that.profile.email = result.body.email;
            that.profile.displayName = result.body.displayName;
            that.profile.diskusage = result.body.diskusage;

            that.refreshConfig(function (error) {
                if (error) return console.error('Cant load config', error);

                that.ready = true;

                // initial load with has if present
                const hash = window.location.hash.slice(1);
                if (hash.indexOf('files/') === 0) that.loadPath(hash, true);
                else if (hash.indexOf('recent/') === 0) that.onRecent();
                else if (hash.indexOf('shares/') === 0) that.loadPath(hash, true);
                else that.loadPath(null, true);
            });
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

.viewer-container {
  z-index: 30;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.sidebar {
    display: flex;
    height: 100%;
    width: 250px;
    background-color: #E8E8E8;
    color: #607D8B;
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
    position: sticky;
    float: right;
    z-index: 30;
    top: 3px;
}

</style>

<style>

.upload .p-progressbar-label {
    line-height: 11px;
    font-size: 11px;
}

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
