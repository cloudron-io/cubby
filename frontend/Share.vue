<template>
  <!-- This is re-used and thus global -->
  <ConfirmDialog></ConfirmDialog>
  <Toast position="top-center" />

  <div class="container" v-show="ready">
    <div class="content">
      <MainToolbar :breadCrumbs="breadCrumbs" :breadCrumbHome="breadCrumbHome" :currentPath="currentPath" :selectedEntries="selectedEntries" :pathPrefix="''" @download="onDownload"/>
      <div class="container" style="overflow: hidden;">
        <div class="main-container-content">
          <Button class="p-button-sm p-button-rounded p-button-text side-bar-toggle" :icon="'pi ' + (sideBarVisible ? 'pi-chevron-right' : 'pi-chevron-left')" @click="onToggleSideBar" v-tooltip="sideBarVisible ? 'Hide Sidebar' : 'Show Sidebar'"/>
          <EntryList :entries="entries" :sort-folders-first="true" :editable="false"
            @entry-activated="onOpen"
            @download="onDownload"
            @selection-changed="onSelectionChanged"
          />
        </div>
        <SideBar :selectedEntries="selectedEntries" :visible="sideBarVisible"/>
      </div>
    </div>
  </div>

  <ImageViewer ref="imageViewer" :entries="entries" @close="onViewerClose" @download="onDownload" v-show="viewer === 'image'" />
  <TextEditor ref="textEditor" :entries="entries" @close="onViewerClose" @saved="onFileSaved" v-show="viewer === 'text'" />
  <PdfViewer ref="pdfViewer" :entries="entries" @close="onViewerClose" v-show="viewer === 'pdf'" />
  <OfficeViewer ref="officeViewer" :entries="entries" @close="onViewerClose" v-show="viewer === 'office'" />
</template>

<script>

import superagent from 'superagent';
import { decode, sanitize, urlSearchQuery, getExtension, download, getDirectLink, prettyFileSize } from './utils.js';

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
            error: '',
            entries: [],
            selectedEntries: [],
            currentPath: '/',
            sideBarVisible: true,
            breadCrumbs: [],
            breadCrumbHome: {
                icon: 'pi pi-share-alt',
                url: '#/'
            }
        };
    },
    methods: {
        prettyFileSize,
        onSelectionChanged(selectedEntries) {
            this.selectedEntries = selectedEntries;
        },
        onToggleSideBar() {
            this.sideBarVisible = !this.sideBarVisible;
        },
        onDownload(entries) {
            if (!entries) entries = this.selectedEntries;

            // TODO use zipping for multiple files
            download(entries[0]);
        },
        loadPath(path) {
            var that = this;

            // FIXME rework this to not make the listview flicker that much

            var filePath = path || that.currentPath || '/';

            window.location.hash = filePath;

            that.busy = true;
            superagent.get('/api/v1/shares/' + that.shareId).query({ path: filePath }).end(function (error, result) {
                that.busy = false;

                if (error) {
                    that.entries = [];

                    if (error.status === 403) that.error = 'Not allowed';
                    else if (error.status === 404) that.error = 'Does not exist';
                    else console.error(error);

                    return;
                }

                that.currentPath = filePath;

                that.breadCrumbs = sanitize(filePath).split('/').filter(function (i) { return !!i; }).map(function (e, i, a) {
                    return {
                        label: decode(e),
                        url: '#'  + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
                    };
                });

                if (result.body.isDirectory) {
                    result.body.files.forEach(function (entry) {
                        entry.extension = getExtension(entry);
                        entry.rename = false;
                        entry.filePathNew = entry.fileName;
                    });
                } else {
                    result.body.files = [];
                }

                that.entries = result.body.files;
            });
        },
        onOpen(entry) {
            if (entry.isDirectory) {
                window.location.hash = entry.filePath;
                return;
            }

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

        function hashChange() {
            const hash = window.location.hash.slice(1);
            that.loadPath(hash);
        }

        window.addEventListener('hashchange', hashChange, false);

        var search = urlSearchQuery();

        if (!search.shareId) return;

        that.shareId = search.shareId;

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
