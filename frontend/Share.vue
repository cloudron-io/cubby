<template>
  <input type="file" ref="uploadFile" style="display: none" multiple/>
  <input type="file" ref="uploadFolder" style="display: none" multiple webkitdirectory directory/>

  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <div class="container" v-show="ready">
    <div class="content">
      <MainToolbar :currentPath="currentPath" :selectedEntries="selectedEntries" @download="onDownload"/>
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entry.files" :sort-folders-first="true" :editable="false"
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

  <ImageViewer ref="imageViewer" :entries="entry.files" @close="onViewerClose" @download="onDownload" v-show="viewer === 'image'" />
  <TextEditor ref="textEditor" :entries="entry.files" @close="onViewerClose" @saved="onFileSaved" v-show="viewer === 'text'" />
  <PdfViewer ref="pdfViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'pdf'" />
  <OfficeViewer ref="officeViewer" :entries="entry.files" @close="onViewerClose" v-show="viewer === 'office'" />
</template>

<script>

import superagent from 'superagent';
import { encode, getPreviewUrl, getExtension, download, getDirectLink, prettyFileSize } from './utils.js';

export default {
    name: 'Index',
    data() {
        return {
            ready: false,
            busy: true,
            accessToken: '',
            search: '',
            viewer: '',
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
            conflictingFilesDialog: {
                visible: false,
                files: []
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
        onSelectionChanged(selectedEntries) {
            this.selectedEntries = selectedEntries;

            if (selectedEntries.length) this.activeEntry = selectedEntries[0];
            else this.activeEntry = this.entry; // reset to current folder/view
        },
        onToggleSideBar() {
            this.sideBarVisible = !this.sideBarVisible;
        },
        onDownload(entries) {
            if (!entries) entries = this.selectedEntries;

            // TODO use zipping for multiple files
            download(entries[0]);
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

        // warn the user if uploads are still in progress
        window.addEventListener('beforeunload', function (event) {
            if (!that.uploadStatus.busy) return;

            event.preventDefault();
            window.confirm('Uploads are still in progress. Please wait for them to finish.');
        }, { capture: true });

        if (!localStorage.accessToken) {
            this.ready = true;
            return;
        }

        that.accessToken = localStorage.accessToken;

        that.ready = true;

        hashChange();
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
