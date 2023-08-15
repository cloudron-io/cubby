<template>
  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <Login v-show="ready && !profile.username" @success="onLoggedIn"/>

  <div class="container" v-show="ready && profile.username">
    <div class="sidebar">
      <h1 style="margin-bottom: 50px; text-align: center;"><img src="/logo-plain.svg" height="60" width="60"/><br/>Cubby</h1>

      <div class="sidebar-entry" @click="showAllFiles"><i class="pi pi-folder-open"></i> All Files</div>
      <div class="sidebar-entry" @click="showAllRecent"><i class="pi pi-clock"></i> Recent Files</div>
      <div class="sidebar-entry" @click="showAllShares"><i class="pi pi-share-alt"></i> Shared With You</div>

      <div style="flex-grow: 1">&nbsp;</div>

      <div class="p-fluid" v-tooltip.top="profile.diskusage ? (prettyFileSize(profile.diskusage.used) + ' of ' + prettyFileSize(profile.diskusage.available)) : ''">
        <span>
          <b>{{ profile.diskusage ? parseInt(profile.diskusage.used / profile.diskusage.available * 100) : 0 }}%</b> of storage used
        </span>
        <ProgressBar class="diskusage" :value="profile.diskusage ? ((profile.diskusage.used / profile.diskusage.size) * 100) : 0" :showValue="false"/>
      </div>
    </div>
    <div class="content">
      <MainToolbar :breadCrumbs="breadCrumbs" :breadCrumbHome="breadCrumbHome" :selectedEntries="selectedEntries" :displayName="profile.displayName" @logout="onLogout" @upload-file="onUploadFile" @upload-folder="onUploadFolder" @new-file="onNewFile" @directory-up="onUp" @new-folder="onNewFolder" @delete="onDelete" @download="onDownload"/>
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
<!--           <EntryList :entries="entries" :sort-folders-first="true" :editable="!isReadonly()" :shareable="isShareable()" :active="viewer === ''"
            @entry-shared="onShare"
            @entry-renamed="onRename"
            @entry-activated="onOpen"
            @delete="onDelete"
            @download="onDownload"
            @selection-changed="onSelectionChanged"
            @dropped="onDrop"
          /> -->
          <DirectoryView
            :show-owner="true"
            :show-size="true"
            :show-modified="true"
            :editable="!isReadonly()"
            @selection-changed="onSelectionChanged"
            @item-activated="onOpen"
            :delete-handler="deleteHandler"
            :rename-handler="renameHandler"
            :change-owner-handler="changeOwnerHandler"
            :copy-handler="copyHandler"
            :cut-handler="cutHandler"
            :paste-handler="pasteHandler"
            :download-handler="downloadHandler"
            :extract-handler="extractHandler"
            :new-file-handler="onNewFile"
            :new-folder-handler="onNewFolder"
            :upload-file-handler="onUploadFile"
            :upload-folder-handler="onUploadFolder"
            :drop-handler="onDrop"
            :items="entries"
            :clipboard="clipboard"
            :owners-model="ownersModel"
            :fallback-icon="`${BASE_URL}mime-types/none.svg`"
            style="position: absolute;"
          />
        </div>
        <SideBar :selectedEntries="selectedEntries" :visible="sideBarVisible"/>
      </div>
      <FileUploader
        ref="fileUploader"
        :upload-handler="uploadHandler"
        @finished="onUploadFinished"
      />
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
    <!-- <TextEditor ref="textEditor" @close="onViewerClose" @saved="onFileSaved" v-show="viewer === 'text'" /> -->
    <!-- <PdfViewer ref="pdfViewer" @close="onViewerClose" v-show="viewer === 'pdf'" /> -->
    <!-- <OfficeViewer ref="officeViewer" :config="config.viewers.collabora" @close="onViewerClose" v-show="viewer === 'office'" /> -->
    <!-- <GenericViewer ref="genericViewer" @close="onViewerClose" v-show="viewer === 'generic'" /> -->
  </div>
</template>

<script>

'use strict';

import superagent from 'superagent';
import async from 'async';
import { parseResourcePath, decode, getExtension, getShareLink, copyToClipboard, sanitize, download, getDirectLink, prettyFileSize } from './utils.js';

import { TextEditor, ImageViewer, DirectoryView, FileUploader } from 'pankow';
import { createDirectoryModel, DirectoryModelError } from './models/DirectoryModel.js';
import { createMainModel } from './models/MainModel.js';

import MainToolbar from './components/MainToolbar.vue';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ? import.meta.env.VITE_API_ORIGIN : '';
const BASE_URL = import.meta.env.BASE_URL || '/';

const beforeUnloadListener = (event) => {
  event.preventDefault();
  return window.confirm('File operation still in progress. Really close?');
};

export default {
    name: 'IndexView',
    components: {
      DirectoryView,
      ImageViewer,
      MainToolbar,
      TextEditor,
      FileUploader
    },
    data() {
      return {
        BASE_URL,
        ready: false,
        busy: true,
        mainModel: null,
        directoryModel: null,
        search: '',
        viewer: '',
        profile: {},
        config: {},
        viewers: [],
        clipboard: {
          action: '', // copy or cut
          files: []
        },
        error: '',
        pasteInProgress: false,
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
      async uploadHandler(targetDir, file, progressHandler) {
        const resource = parseResourcePath(targetDir);
        await this.directoryModel.upload(resource, file, progressHandler);
        this.refresh();
      },
      async onLogout() {
        await this.mainModel.logout();

        this.profile.username = '';
        this.profile.email = '';
        this.profile.displayName = '';
        this.profile.diskusage = {
          used: 0,
          size: 0,
          available: 0
        };
      },
      async onLoggedIn() {
        this.profile = await this.mainModel.getProfile();
        this.config = await this.mainModel.getConfig();

        this.loadPath(window.location.hash.slice(1), true);
      },
      onUploadFinished() {
        this.refresh();
      },
      onUploadFile() {
        const resource = parseResourcePath(this.currentResourcePath || 'files/');
        this.$refs.fileUploader.onUploadFile(resource.resourcePath);
      },
      onUploadFolder() {
        const resource = parseResourcePath(this.currentResourcePath || 'files/');
        this.$refs.fileUploader.onUploadFolder(resource.resourcePath);
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
      async copyHandler(files) {
        if (!files) return;

        this.clipboard = {
          action: 'copy',
          files
        };
      },
      async cutHandler(files) {
        if (!files) return;

        this.clipboard = {
          action: 'cut',
          files
        };
      },
      async pasteHandler(target) {
        if (!this.clipboard.files || !this.clipboard.files.length) return;

        window.addEventListener('beforeunload', beforeUnloadListener, { capture: true });
        this.pasteInProgress = true;

        const resource = parseResourcePath((target && target.isDirectory) ? sanitize(this.currentResourcePath + '/' + target.fileName) : this.currentResourcePath);
        await this.directoryModel.paste(resource, this.clipboard.action, this.clipboard.files);
        this.clipboard = {};
        await this.refresh();

        window.removeEventListener('beforeunload', beforeUnloadListener, { capture: true });
        this.pasteInProgress = false;
      },
        async onSaveNewFileDialog() {
            const path = sanitize(this.currentPath + '/' + this.newFileDialog.fileName);
            const resource = parseResourcePath(this.currentResourcePath || 'files/');

            try {
              await this.directoryModel.newFile(resource, path);
            } catch (error) {
              if (error.reason === DirectoryModelError.NO_AUTH) this.onLogout();
              else if (error.reason === DirectoryModelError.NOT_ALLOWED) this.newFileDialog.error = 'File name not allowed';
              else if (error.reason === DirectoryModelError.CONFLICT) this.newFileDialog.error = 'File already exists';
              else {
                this.newFolderDialog.error = 'Unkown error, check logs';
                console.error('Failed to add file, unknown error:', error)
              }

              return;
            }

            this.refresh();
            this.newFileDialog.visible = false;
        },
        async onSaveNewFolderDialog() {
          const path = sanitize(this.currentPath + '/' + this.newFolderDialog.folderName);
          const resource = parseResourcePath(this.currentResourcePath || 'files/');

          try {
            await this.directoryModel.newFolder(resource, path);
          } catch (error) {
            if (error.reason === DirectoryModelError.NO_AUTH) this.onLogout();
            else if (error.reason === DirectoryModelError.NOT_ALLOWED) this.newFolderDialog.error = 'Folder name not allowed';
            else if (error.reason === DirectoryModelError.CONFLICT) this.newFolderDialog.error = 'Folder already exists';
            else {
              this.newFolderDialog.error = 'Unkown error, check logs';
              console.error('Failed to add folder, unknown error:', error)
            }

            return;
          }

          this.refresh();
          this.newFolderDialog.visible = false;
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

            const resource = parseResourcePath(this.currentResourcePath);
            traverseFileTree(folderItem, '', (error) => {
              if (error) return console.error(error);

              this.$refs.fileUploader.addFiles(files, resource.resourcePath);
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
      async refresh() {
        await this.loadPath(null, true);
      },
      async loadPath(path, alwaysRefresh) {
        const resource = parseResourcePath(path || this.currentResourcePath || 'files/');

        // check if we actually have a new path to fetch
        var currentResource = null;
        if (!alwaysRefresh && this.currentResourcePath) {
          currentResource = parseResourcePath(this.currentResourcePath);

          if (currentResource.resourcePath === resource.resourcePath) return;
        }

        // only show busy state if it takes more than 2 seconds to avoid flickering
        var busyTimer = setTimeout(() => { this.busy = true; }, 2000);

        let entry;
        try {
          entry = await this.directoryModel.get(resource, resource.path);
        } catch (error) {
          this.entries = [];
          entry = {};

          if (error.status === 401) return this.onLogout();
          else if (error.status === 404) this.error = 'Does not exist';
          else console.error(error);
        }

        clearTimeout(busyTimer);
        this.busy = false;

        // update the browser hash
        window.location.hash = resource.resourcePath;

        if (entry.isDirectory) {
          this.currentPath = resource.path;
          this.currentResourcePath = resource.resourcePath;
          this.currentShare = entry.share || null;

          if (resource.type === 'files') {
            this.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
              return {
                label: decode(e),
                url: '#files' + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
              };
            });
            this.breadCrumbHome = {
              icon: 'pi pi-home',
              url: '#files/'
            };
          } else if (resource.type === 'shares') {
            this.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
              return {
                label: decode(e),
                url: '#shares/' + resource.shareId  + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
              };
            });
            this.breadCrumbHome = {
              icon: 'pi pi-share-alt',
              url: '#shares/'
            };

            // if we are not toplevel, add the share information
            if (entry.share) {
              this.breadCrumbs.unshift({
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

          this.entries = entry.files;
          this.viewer = '';

          this.clearSelection();
        } else {
          if (this.$refs.imageViewer.canHandle(entry)) {
            const otherSupportedEntries = this.entries.filter((e) => this.$refs.imageViewer.canHandle(e)).map((e) => {
              e.resourceUrl = `/viewer/${resource.apiPath}/${e.folderPath}/${e.fileName}`;
              return e;
            });

            this.$refs.imageViewer.open(entry, otherSupportedEntries);
            this.viewer = 'image';
          } else if (this.$refs.textEditor.canHandle(entry)) {
            superagent.get(getDirectLink(entry)).end(function (error, result) {
              if (error) return console.error(error);

              this.$refs.textEditor.open(entry, result.text);
              this.viewer = 'text';
            });
          } else if (this.$refs.pdfViewer.canHandle(entry)) {
            this.$refs.pdfViewer.open(entry);
            this.viewer = 'pdf';
          } else if (this.$refs.officeViewer.canHandle(entry)) {
            this.$refs.officeViewer.open(entry);
            this.viewer = 'office';
          } else {
            this.viewer = 'generic';
            this.$refs.genericViewer.open(entry);
          }
        }
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
    },
    async mounted() {
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);

        if (hash.indexOf('files/') === 0) this.loadPath(hash);
        else if (hash.indexOf('recent/') === 0) this.onRecent();
        else if (hash.indexOf('shares/') === 0) this.loadPath(hash);
        else window.location.hash = 'files/';
      }, false);

      this.mainModel = createMainModel(API_ORIGIN);

      try {
        this.profile = await this.mainModel.getProfile();
      } catch (e) {
        console.error('Failed to get profile.', e);
        this.ready = true;
        return;
      }


      try {
        this.config = await this.mainModel.getConfig();
      } catch (e) {
        console.error('Failed to get config.', e);
        this.ready = true;
        return;
      }

      this.directoryModel = createDirectoryModel(API_ORIGIN);

      // initial load with hash if present
      const hash = window.location.hash.slice(1);
      if (hash.indexOf('files/') === 0) this.loadPath(hash, true);
      else if (hash.indexOf('recent/') === 0) this.onRecent();
      else if (hash.indexOf('shares/') === 0) this.loadPath(hash, true);
      else this.loadPath(null, true);

      this.ready = true;
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
    background: linear-gradient(90deg, rgb(168, 85, 247) 0%,rgb(33, 150, 243) 100%);
    color: white;
    padding: 10px;
    flex-direction: column;
}

.sidebar-entry {
  cursor: pointer;
  padding: 10px;
  padding-left: 20px;
  border-radius: 3px;
}

.sidebar-entry:hover {
  background-color: rgba(255,255,255,0.2);
}

.sidebar-entry > i {
  padding-right: 10px;
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
