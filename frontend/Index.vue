<template>
  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <LoginView v-show="ready && showLogin"/>

  <div class="container" v-show="ready && !showLogin">
    <div class="navigation-panel">
      <h1 style="margin-bottom: 50px; text-align: center;"><img src="/logo-transparent.svg" height="60" width="60"/><br/>Cubby</h1>

      <a class="navigation-panel-entry" v-show="profile.username" href="#files/home/"><i class="pi pi-folder-open"></i> All Files</a>
      <a class="navigation-panel-entry" v-show="profile.username" href="#files/recent/"><i class="pi pi-clock"></i> Recent Files</a>
      <a class="navigation-panel-entry" v-show="profile.username" href="#files/shares/"><i class="pi pi-share-alt"></i> Shared With You</a>

      <div style="flex-grow: 1">&nbsp;</div>

      <div class="p-fluid" v-show="profile.diskusage" v-tooltip.top="profile.diskusage ? (prettyFileSize(profile.diskusage.used) + ' of ' + prettyFileSize(profile.diskusage.available)) : ''">
        <span>
          <b>{{ profile.diskusage ? parseInt(profile.diskusage.used / profile.diskusage.available * 100) : 0 }}%</b> of storage used
        </span>
        <ProgressBar class="diskusage" :value="profile.diskusage ? ((profile.diskusage.used / profile.diskusage.size) * 100) : 0" :showValue="false"/>
      </div>
    </div>
    <div class="content">
      <MainToolbar
        :breadCrumbs="breadCrumbs"
        :breadCrumbHome="breadCrumbHome"
        :selectedEntries="selectedEntries"
        :displayName="profile.displayName"
        :readonly="isReadonly()"
        @logout="onLogout(true)"
        @upload-file="onUploadFile"
        @upload-folder="onUploadFolder"
        @new-file="onNewFile"
        @directory-up="onUp"
        @new-folder="onNewFolder"
        :on-delete="deleteHandler"
        :on-download="downloadHandler"
        @login="showLogin=true;"
        :on-web-dav-settings="onWebDavSettings"
      />
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (previewPanelVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onTogglePreviewPanel" v-tooltip="previewPanelVisible ? 'Hide Preview' : 'Show Preview'"/>
          <div v-show="!entries.length" class="no-entries-placeholder">
            <p v-show="activeResourceType === 'home' || (activeResourceType === 'shares' && breadCrumbs.length)">Folder is empty</p>
            <p v-show="activeResourceType === 'recent'">No recent files</p>
            <p v-show="activeResourceType === 'shares' && !breadCrumbs.length">Nothing shared with you yet.</p>
          </div>
          <DirectoryView v-show="entries.length"
            :show-owner="false"
            :show-size="true"
            :show-modified="true"
            :show-share="true"
            :editable="!isReadonly()"
            :multi-download="true"
            @selection-changed="onSelectionChanged"
            @item-activated="onOpen"
            :delete-handler="deleteHandler"
            :share-handler="shareHandler"
            :rename-handler="renameHandler"
            :copy-handler="copyHandler"
            :cut-handler="cutHandler"
            :paste-handler="pasteHandler"
            :download-handler="downloadHandler"
            :new-file-handler="onNewFile"
            :new-folder-handler="onNewFolder"
            :upload-file-handler="onUploadFile"
            :upload-folder-handler="onUploadFolder"
            :drop-handler="onDrop"
            :items="entries"
            :clipboard="clipboard"
            :fallback-icon="`${BASE_URL}mime-types/none.svg`"
            style="position: absolute;"
          />
        </div>
        <PreviewPanel :parentEntry="entry" :selectedEntries="selectedEntries" :visible="previewPanelVisible"/>
      </div>
      <FileUploader
        ref="fileUploader"
        :upload-handler="uploadHandler"
        @finished="onUploadFinished"
      />
    </div>
  </div>

  <!-- WebDAV Password Dialog -->
  <Dialog header="WebDAV Password" v-model:visible="webDavPasswordDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '640px'}" :modal="true">
    <p>Files can be used over WebDAV at <i>{{ API_ORIGIN }}/webdav/{{ profile.username }}/</i></p>
    <p>Set a WebDAV password:</p>
    <form @submit="onSaveWebDavDialog" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <Password v-model="webDavPasswordDialog.password" autofocus required :class="{ 'p-invalid': webDavPasswordDialog.error }"/>
          <small class="p-invalid" v-show="webDavPasswordDialog.error">{{ webDavPasswordDialog.error }}</small>
        </div>
      </div>
    </form>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="webDavPasswordDialog.visible = false"/>
      <Button label="Save" icon="pi pi-check" class="p-button-text p-button-success" @click="onSaveWebDavDialog" :disabled="!webDavPasswordDialog.password"/>
    </template>
  </Dialog>

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
  <Dialog :header="shareDialog.entry.fileName" v-model:visible="shareDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '720px'}" :modal="true">
    <h3>Create Share</h3>
    <form @submit="onCreateShare" @submit.prevent>
      <div class="p-fluid">
        <div class="p-field">
          <Dropdown v-model="shareDialog.receiverUsername" :options="shareDialog.users" optionDisabled="alreadyUsed" optionValue="username" optionLabel="userAndDisplayName" placeholder="Select a user" />
          <small class="p-invalid" v-show="shareDialog.error">{{ shareDialog.error }}</small>
        </div>
      </div>
      <div>
        <!-- <div class="p-field-checkbox">
          <Checkbox id="binary" v-model="shareDialog.readonly" :binary="true" />
          <label for="binary">Share read-only</label>
        </div> -->
        <Button label="Create share" icon="pi pi-check" class="p-button p-button-success" @click="onCreateShare" :disabled="!shareDialog.receiverUsername"/>
      </div>
    </form>

    <h3>Shared with</h3>
    <DataTable :value="shareDialog.sharedWith" class="p-datatable-sm" responsiveLayout="scroll">
      <template #empty>
        Not shared with anyone yet
      </template>
      <Column header="User">
        <template #body="slotProps">
          {{ slotProps.data.receiverUsername || slotProps.data.receiverEmail }}
        </template>
      </Column>
      <!-- <Column header="Readonly" headerClass="share-readonly-column" :style="{ textAlign: 'center' }">
        <template #body="slotProps">
          <Checkbox v-model="slotProps.data.readonly" :binary="true" readonly/>
        </template>
      </Column> -->
      <Column header="" :style="{ textAlign: 'right' }">
        <template #body="slotProps">
          <Button class="p-button-rounded p-button-danger p-button-text" icon="pi pi-trash" v-tooltip.top="'Delete'" @click="onDeleteShare(slotProps.data)"/>
        </template>
      </Column>
    </DataTable>

    <br/>

    <h3 style="margin-top: 0;">Create Share Link</h3>
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

    <h3>Shared Links</h3>
    <DataTable :value="shareDialog.sharedLinks" class="p-datatable-sm" responsiveLayout="scroll">
      <template #empty>
        No shared links yet
      </template>
      <Column header="Link">
        <template #body="slotProps">
          <Button class="p-button p-button-sm p-button-text" @click="copyShareIdLinkToClipboard(slotProps.data.id)">Copy Link to Clipboard</Button>
        </template>
      </Column>
      <!-- <Column header="Readonly" headerClass="share-readonly-column" :style="{ textAlign: 'center' }">
        <template #body="slotProps">
          <Checkbox v-model="slotProps.data.readonly" :binary="true" readonly/>
        </template>
      </Column> -->
      <Column header="" :style="{ textAlign: 'right' }">
        <template #body="slotProps">
          <Button class="p-button-rounded p-button-danger p-button-text" icon="pi pi-trash" v-tooltip.top="'Delete'" @click="onDeleteShare(slotProps.data)"/>
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <Button label="Close" icon="pi pi-times" class="p-button-text" @click="shareDialog.visible = false"/>
    </template>
  </Dialog>

  <Transition name="pop">
    <div class="viewer-container" v-show="viewer === 'image'">
      <ImageViewer ref="imageViewer" @close="onViewerClose" :navigation-handler="onViewerEntryChanged" :download-handler="downloadHandler" />
    </div>
  </Transition>
  <Transition name="pop">
    <div class="viewer-container" v-show="viewer === 'text'">
      <TextEditor ref="textEditor" @close="onViewerClose" :save-handler="onFileSaved" />
    </div>
  </Transition>
  <Transition name="pop">
    <div class="viewer-container" v-show="viewer === 'pdf'">
      <PdfViewer ref="pdfViewer" @close="onViewerClose" />
    </div>
  </Transition>
  <Transition name="pop">
    <div class="viewer-container" v-show="viewer === 'office'">
      <OfficeViewer ref="officeViewer" :config="config" @close="onViewerClose" />
    </div>
  </Transition>
  <Transition name="pop">
    <div class="viewer-container" v-show="viewer === 'generic'">
      <GenericViewer ref="genericViewer" @close="onViewerClose" />
    </div>
  </Transition>
</template>

<script>

'use strict';

import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import ProgressBar from 'primevue/progressbar';
import Toast from 'primevue/toast';

import { parseResourcePath, getExtension, copyToClipboard, sanitize } from './utils.js';
import { prettyFileSize } from 'pankow/utils';

import { TextEditor, ImageViewer, DirectoryView, FileUploader, PdfViewer, GenericViewer } from 'pankow';
import { createDirectoryModel, DirectoryModelError } from './models/DirectoryModel.js';
import { createMainModel } from './models/MainModel.js';
import { createShareModel } from './models/ShareModel.js';

// import OfficeViewer from './components/OfficeViewer.vue';
import LoginView from './components/LoginView.vue';
import MainToolbar from './components/MainToolbar.vue';
import PreviewPanel from './components/PreviewPanel.vue';
import OfficeViewer from './components/OfficeViewer.vue';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ? import.meta.env.VITE_API_ORIGIN : '';
const BASE_URL = import.meta.env.BASE_URL || '/';

const beforeUnloadListener = (event) => {
  event.preventDefault();
  return window.confirm('File operation still in progress. Really close?');
};

export default {
    name: 'IndexView',
    components: {
      Button,
      Calendar,
      Checkbox,
      Column,
      ConfirmDialog,
      DataTable,
      Dialog,
      DirectoryView,
      Dropdown,
      GenericViewer,
      ImageViewer,
      InputText,
      LoginView,
      MainToolbar,
      OfficeViewer,
      TextEditor,
      Password,
      PdfViewer,
      PreviewPanel,
      ProgressBar,
      FileUploader,
      Toast
    },
    data() {
      return {
        API_ORIGIN,
        BASE_URL,
        ready: false,
        busy: true,
        showLogin: false,
        mainModel: null,
        shareModel: null,
        directoryModel: null,
        search: '',
        viewer: '',
        activeResourceType: '',
        profile: {},
        config: {},
        viewers: [],
        clipboard: {
          action: '', // copy or cut
          files: []
        },
        currentHash: '',
        error: '',
        // TODO show busy state for those
        pasteInProgress: false,
        deleteInProgress: false,
        entry: {},
        entries: [],
        selectedEntries: [],
        currentPath: '/',
        currentResourcePath: '',
        currentShare: null,
        previewPanelVisible: localStorage.previewPanelVisible === 'true',
        breadCrumbs: [],
        breadCrumbHome: {
          icon: 'pi pi-home',
          route: '#files'
        },
        webDavPasswordDialog: {
          visible: false,
          error: '',
          password: ''
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
        shareDialog: {
          visible: false,
          error: '',
          receiverUsername: '',
          readonly: false,
          users: [],
          sharedWith: [],
          shareLinks: [],
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
        window.location.hash = 'files/home/';
      },
      async onWebDavSettings() {
        this.webDavPasswordDialog.error = '';
        this.webDavPasswordDialog.password = '';
        this.webDavPasswordDialog.visible = true;
      },
      async uploadHandler(targetDir, file, progressHandler) {
        const resource = parseResourcePath(targetDir);

        await this.directoryModel.upload(resource, file, progressHandler);

        this.refresh();
      },
      async onLogout(clearReturnTo = false) {
        // stash for use later after re-login
        if (clearReturnTo) localStorage.returnTo = '';
        else localStorage.returnTo = window.location.hash.slice(1);

        await this.mainModel.logout();

        this.showLogin = true;
        this.profile.username = '';
        this.profile.email = '';
        this.profile.displayName = '';
        this.profile.diskusage = {
          used: 0,
          size: 0,
          available: 0
        };
      },
      onViewerEntryChanged(entry) {
        // prevent to reload image
        this.currentHash = `#files${entry.resourcePath}`
        window.location.hash = `files${entry.resourcePath}`;
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
        const resource = parseResourcePath(this.currentResourcePath || 'files/');

        try {
          await this.directoryModel.newFile(resource, this.newFileDialog.fileName);
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
      async onSaveWebDavDialog() {
        try {
          await this.mainModel.setWebDavPassword(this.webDavPasswordDialog.password);
        } catch (error) {
          if (error.reason === DirectoryModelError.NO_AUTH) this.onLogout();
          else {
            this.webDavPasswordDialog.error = 'Unkown error, check logs';
            console.error('Failed to set webdav password:', error)
          }

          return;
        }

        this.webDavPasswordDialog.visible = false;
      },
      async onSaveNewFolderDialog() {
        const resource = parseResourcePath(this.currentResourcePath || 'files/');

        try {
          await this.directoryModel.newFolder(resource, this.newFolderDialog.folderName);
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
      clearSelection() {
        this.selectedEntries = [];
      },
      onSelectionChanged(selectedEntries) {
        this.selectedEntries = selectedEntries;
      },
      onTogglePreviewPanel() {
        this.previewPanelVisible = !this.previewPanelVisible;
        localStorage.previewPanelVisible = this.previewPanelVisible;
      },
      async onFileSaved(entry, content, done) {
        try {
          await this.directoryModel.saveFile(entry.resource, content);
        } catch (error) {
          console.error(`Failed to save file ${entry.resourcePath}`, error);
        }

        if (typeof done === 'function') done();
      },
      async downloadHandler(entries) {
        if (!entries) entries = this.selectedEntries;
        if (!Array.isArray(entries)) entries = [ entries ];

        const resource = parseResourcePath(this.currentResourcePath);
        await this.directoryModel.download(resource, entries);
      },
      // either dataTransfer (external drop) or files (internal drag)
      async onDrop(targetFolder, dataTransfer, files) {
        const fullTargetFolder = sanitize(`${this.currentResourcePath}/${targetFolder}`);

        const that = this;
        function traverseFileTree(item, path) {
          if (item.isFile) {
            item.file(function (file) {
              that.$refs.fileUploader.addFiles([file], sanitize(`${that.currentResourcePath}/${targetFolder}`), false);
            });
          } else if (item.isDirectory) {
            // Get folder contents
            var dirReader = item.createReader();
            dirReader.readEntries(function (entries) {
              for (let i in entries) {
                traverseFileTree(entries[i], item.name);
              }
            });
          }
        }

        if (dataTransfer) {
          // figure if a folder was dropped on a modern browser, in this case the first would have to be a directory
          let folderItem;
          try {
              folderItem = dataTransfer.items[0].webkitGetAsEntry();
              if (folderItem.isFile) return this.$refs.fileUploader.addFiles(dataTransfer.files, fullTargetFolder, false);
          } catch (e) {
              return this.$refs.fileUploader.addFiles(dataTransfer.files, fullTargetFolder, false);
          }

          // if we got here we have a folder drop and a modern browser
          // now traverse the folder tree and create a file list
          traverseFileTree(folderItem, '');
        } else {
          if (!files.length) return;

          window.addEventListener('beforeunload', beforeUnloadListener, { capture: true });
          this.pasteInProgress = true;

          // check ctrl for cut/copy
          await this.directoryModel.paste(parseResourcePath(fullTargetFolder), 'cut', files);
          await this.refresh();

          window.removeEventListener('beforeunload', beforeUnloadListener, { capture: true });
          this.pasteInProgress = false;
        }
      },
      async deleteHandler(entries) {
        if (!entries) return;

        function start_and_end(str) {
          if (str.length > 100) {
            return str.substr(0, 45) + ' ... ' + str.substr(str.length-45, str.length);
          }
          return str;
        }

        this.$confirm.require({
          header: 'Really delete files?',
          message: start_and_end(entries.map((f) => f.name).join(', ')),
          icon: '',
          acceptClass: 'p-button-danger',
          accept: async () => {
            this.$confirm.close();

            window.addEventListener('beforeunload', beforeUnloadListener, { capture: true });
            this.deleteInProgress = true;

            for (let i in entries) {
              try {
                const resource = parseResourcePath(sanitize(this.currentResourcePath + '/' + entries[i].fileName));
                await this.directoryModel.remove(resource);
              } catch (e) {
                console.error(`Failed to remove file ${entries[i].name}:`, e);
              }
            }

            await this.refresh();

            window.removeEventListener('beforeunload', beforeUnloadListener, { capture: true });
            this.deleteInProgress = false;
          }
        });
      },
      async renameHandler(file, newName) {
        const fromResource = file.resource;
        const toResource = parseResourcePath(sanitize(this.currentResourcePath + '/' + newName));

        if (fromResource.resourcePath === toResource.resourcePath) return;

        await this.directoryModel.rename(fromResource, toResource);
        await this.refresh();
      },
      isReadonly() {
        if (window.location.hash === '#files/shares/' || window.location.hash === '#files/recent/') return true;
        if (!this.currentShare) return false;
        return this.currentShare.readonly;
      },
      isShareable() {
        const resource = parseResourcePath(this.currentResourcePath || 'files/');
        return resource.type !== 'shares';
      },
      async refreshShareDialogEntry(entry = null) {
        this.shareDialog.entry = await this.directoryModel.get(entry || this.shareDialog.entry);

        this.shareDialog.sharedWith = this.shareDialog.entry.sharedWith.filter((s) => s.receiverUsername);
        this.shareDialog.sharedLinks = this.shareDialog.entry.sharedWith.filter((s) => !s.receiverUsername);

        this.shareDialog.users.forEach((user) => {
          user.alreadyUsed = this.shareDialog.entry.sharedWith.find((share) => { return share.receiverUsername === user.username; });
        });

        this.refresh();
      },
      async shareHandler(entry) {
        this.shareDialog.error = '';
        this.shareDialog.receiverUsername = '';
        this.shareDialog.readonly = false;
        this.shareDialog.shareLink.expires = false;
        this.shareDialog.shareLink.expiresAt = new Date()

        // start with tomorrow
        this.shareDialog.shareLink.expiresAt.setDate(this.shareDialog.shareLink.expiresAt.getDate() + 1);

        // prepare available users for sharing
        const users = await this.mainModel.getUsers();
        this.shareDialog.users = users.filter((u) => { return u.username !== this.profile.username; });
        this.shareDialog.users.forEach((u) => { u.userAndDisplayName = u.displayName + ' ( ' + u.username + ' )'; });

        this.refreshShareDialogEntry(entry);

        this.shareDialog.visible = true;
      },
      copyShareIdLinkToClipboard(shareId) {
        copyToClipboard(this.shareModel.getLink(shareId));
        this.$toast.add({ severity:'success', summary: 'Share link copied to clipboard', life: 2000 });
      },
      async onCreateShareLink() {
        const path = this.shareDialog.entry.filePath;
        const readonly = true; // always readonly for now
        const expiresAt = this.shareDialog.shareLink.expires ? this.shareDialog.shareLink.expiresAt : 0;

        const shareId = await this.shareModel.create({ path, readonly, expiresAt });

        this.copyShareIdLinkToClipboard(shareId);

        this.refreshShareDialogEntry();
      },
      async onCreateShare() {
        const path = this.shareDialog.entry.filePath;
        const readonly = this.shareDialog.readonly;
        const receiverUsername = this.shareDialog.receiverUsername;

        await this.shareModel.create({ path, readonly, receiverUsername });

        // reset the form
        this.shareDialog.error = '';
        this.shareDialog.receiverUsername = '';
        this.shareDialog.readonly = false;

        // refresh the entry
        this.shareDialog.entry = await this.directoryModel.get(this.shareDialog.entry);
        this.refreshShareDialogEntry();
      },
      async onDeleteShare(share) {
        await this.shareModel.remove(share.id);
        this.refreshShareDialogEntry();
      },
      async refresh() {
        await this.loadPath(null, true);
      },
      async loadMainDirectory(path, entry, forceLoad = false) {
        // path is files/filepath or shares/shareid/filepath
        const resource = parseResourcePath(path);

        // nothing new
        if (!forceLoad && this.currentResourcePath === resource.resourcePath) return;

        if (!entry) {
          try {
            entry = await this.directoryModel.get(resource, resource.path);
          } catch (error) {
            this.entries = [];
            entry = {};

            if (error.status === 401) return this.onLogout();
            else if (error.status === 404) this.error = 'Does not exist';
            else console.error(error);
          }
        }

        this.activeResourceType = resource.type;
        this.currentPath = resource.path;
        this.currentResourcePath = resource.resourcePath;
        this.currentShare = entry.share || null;

        if (resource.type === 'home') {
          this.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
            return {
              label: e,
              route: '#files/home' + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
            };
          });
          this.breadCrumbHome = {
            icon: 'pi pi-home',
            route: '#files/home/'
          };
        } else if (resource.type === 'recent') {
          this.breadCrumbs = [];
          this.breadCrumbHome = {
            icon: 'pi pi-clock',
            route: '#files/recent/'
          };
        } else if (resource.type === 'shares') {
          this.breadCrumbs = sanitize(resource.path).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
            return {
              label: e,
              route: '#files/shares/' + resource.shareId  + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
            };
          });
          this.breadCrumbHome = {
            icon: 'pi pi-share-alt',
            route: '#files/shares/'
          };

          // if we are not toplevel, add the share information
          if (entry.share) {
            this.breadCrumbs.unshift({
              label: entry.share.filePath.slice(1), // remove slash at the beginning
              route: '#shares/' + resource.shareId + '/'
            });
          }
        } else {
          console.error('FIXME breadcrumbs for resource type', resource.type);
        }

        entry.files.forEach(function (e) {
          e.extension = getExtension(e);
          e.filePathNew = e.fileName;
        });

        this.entry = entry;
        this.entries = entry.files;
        this.viewer = '';
      },
      async loadPath(path, forceLoad = false) {
        const resource = parseResourcePath(path || this.currentResourcePath);

        // clear potential viewer first
        if (this.viewer) this.viewer = '';

        if (!forceLoad && this.currentResourcePath === resource.resourcePath) return;

        let entry;
        try {
          entry = await this.directoryModel.get(resource);
        } catch (error) {
          this.entries = [];
          entry = {};

          if (error.status === 401 || error.status === 403) return this.onLogout();
          else if (error.status === 404) return console.error('Failed to load entry', resource, error);
          else console.error(error);
        }

        // update the browser hash
        window.location.hash = `files${resource.resourcePath}`;

        if (entry.isDirectory) await this.loadMainDirectory(resource.resourcePath, entry, forceLoad);
        else await this.loadMainDirectory(resource.parentResourcePath, null, forceLoad);

        // if we don't have a folder load the viewer
        if (!entry.isDirectory) {
          if (this.$refs.imageViewer.canHandle(entry)) {
            const otherSupportedEntries = this.entries.filter((e) => this.$refs.imageViewer.canHandle(e));

            this.$refs.imageViewer.open(entry, otherSupportedEntries);
            this.viewer = 'image';
          } else if (this.$refs.pdfViewer.canHandle(entry)) {
            this.$refs.pdfViewer.open(entry);
            this.viewer = 'pdf';
          } else if (this.$refs.officeViewer.canHandle(entry)) {
            this.$refs.officeViewer.open(entry);
            this.viewer = 'office';
          } else if (this.$refs.textEditor.canHandle(entry)) {
            this.$refs.textEditor.open(entry, await this.directoryModel.getRawContent(resource));
            this.viewer = 'text';
          } else {
            this.viewer = 'generic';
            this.$refs.genericViewer.open(entry);
          }
        } else {
          this.clearSelection();
        }
      },
      onOpen(entry) {
        if (entry.share && entry.share.id) window.location.hash = `files/shares/${entry.share.id}${entry.filePath}`;
        else window.location.hash = `files/home${entry.filePath}`;
      },
      onViewerClose() {
        this.viewer = '';

        // update the browser hash
        const resource = parseResourcePath(this.currentResourcePath || '/home/');
        window.location.hash = `files${resource.resourcePath}`;
      },
      onUp() {
        if (window.location.hash.indexOf('#shares/') === 0) {
          const hash = window.location.hash.slice('#shares/'.length);

          // if we are first level of that share, go back to all shares
          if (!hash.split('/')[1]) window.location.hash = 'shares/';
          else window.location.hash = hash.split('/')[0] + sanitize(hash.split('/').filter(function (p) { return !!p; }).slice(1, -1).join('/'));
        } else {
          const hash = window.location.hash.slice(1);
          window.location.hash = hash.split('/')[0] + sanitize(hash.split('/').filter(function (p) { return !!p; }).slice(1, -1).join('/'));
        }
      },
    },
    async mounted() {
      window.addEventListener('hashchange', () => {
        // allows us to not reload but only change the hash
        if (this.currentHash === decodeURIComponent(window.location.hash)) return;
        this.currentHash = window.location.hash;

        const hash = window.location.hash.slice(1);

        if (hash.indexOf('files/home/') === 0) this.loadPath(hash.slice('files'.length));
        else if (hash.indexOf('files/recent/') === 0) this.loadPath(hash.slice('files'.length));
        else if (hash.indexOf('files/shares/') === 0) this.loadPath(hash.slice('files'.length));
        else if (hash.indexOf('settings/') === 0) return;
        else window.location.hash = 'files/home/';
      }, false);

      this.mainModel = createMainModel(API_ORIGIN);
      this.shareModel = createShareModel(API_ORIGIN);

      try {
        this.profile = await this.mainModel.getProfile();
      } catch (e) {
        if (e.cause && e.cause.status !== 401) return console.error('Failed to get profile.', e);
      }

      try {
        this.config = await this.mainModel.getConfig();
      } catch (e) {
        if (e.cause && e.cause.status !== 401) return console.error('Failed to get config.', e);
      }

      this.directoryModel = createDirectoryModel(API_ORIGIN);

      // initial load with hash if any
      const hash = localStorage.returnTo || window.location.hash.slice(1);
      localStorage.returnTo = '';

      if (hash.indexOf('files/home/') === 0) await this.loadPath(hash.slice('files'.length));
      else if (hash.indexOf('files/recent/') === 0) await this.loadPath(hash.slice('files'.length));
      else if (hash.indexOf('files/shares/') === 0) await this.loadPath(hash.slice('files'.length));
      else await this.loadPath('/home/');

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

.no-entries-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
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

.navigation-panel {
    display: flex;
    height: 100%;
    width: 250px;
    background: linear-gradient(90deg, rgb(168, 85, 247) 0%,rgb(33, 150, 243) 100%);
    color: white;
    padding: 10px;
    flex-direction: column;
}

.navigation-panel-entry {
  cursor: pointer;
  color: white;
  padding: 10px;
  padding-left: 20px;
  border-radius: 3px;
}

.navigation-panel-entry:hover {
  background-color: rgba(255,255,255,0.2);
}

.navigation-panel-entry > i {
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

@media only screen and (max-width: 767px) {
  .side-bar-toggle {
    display: none;
  }
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
