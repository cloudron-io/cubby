<template>
  <ContextMenu ref="entryListContextMenu" :model="contextMenuItem" />

  <div class="loading" v-show="$parent.busy">
    <i class="pi pi-spin pi-spinner" style="fontSize: 2rem"></i>
  </div>
  <div class="table" v-show="!$parent.busy" @drop.stop.prevent="drop(null)" @dragover.stop.prevent="dragOver(null)" @dragexit="dragExit" :class="{ 'drag-active': dragActive === 'table' }" v-cloak>
    <div class="th p-d-none p-d-md-flex">
      <div class="td" style="max-width: 50px;"></div>
      <div class="td hand" style="flex-grow: 2;" @click="onSort('fileName')">Name <i class="pi" :class="{'pi-sort-alpha-down': sort.desc, 'pi-sort-alpha-up-alt': !sort.desc }" v-show="sort.prop === 'fileName'"></i></div>
      <div class="td hand" style="max-width: 150px;" @click="onSort('mtime')">Updated <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'mtime'"></i></div>
      <div class="td hand" style="max-width: 100px;" @click="onSort('size')">Size <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'size'"></i></div>
      <div class="td" style="min-width: 180px; justify-content: flex-end;"></div>
    </div>
    <div class="tbody">
      <div class="tr-placeholder" v-show="entries.length === 0">{{ emptyPlaceholder }}</div>
      <div class="tr-placeholder" v-show="entries.length !== 0 && filteredAndSortedEntries.length === 0">Nothing found</div>
      <div class="tr" v-for="entry in filteredAndSortedEntries" :key="entry.id" @contextmenu="onContextMenu(entry, $event)" @dblclick="onEntryOpen(entry, false)" @click="onEntrySelect(entry, $event)" @drop.stop.prevent="drop(entry)" @dragover.stop.prevent="dragOver(entry)" :class="{ 'selected': selected.includes(getEntryIdentifier(entry)), 'drag-active': entry === dragActive }">
        <div class="td icon"><img :src="getPreviewUrl(entry)" @load="previewLoaded(entry)" @error="previewError(entry, $event)" style="object-fit: cover;" v-show="!entry.previewLoading"/><i class="pi pi-spin pi-spinner" v-show="entry.previewLoading"></i></div>
        <div class="td" style="flex-grow: 2;">
          <InputText @click.stop @keyup.enter="onRenameSubmit(entry)" @keyup.esc="onRenameEnd(entry)" @blur="onRenameEnd(entry)" v-model="entry.filePathNew" :id="'filePathRenameInputId-' + entry.fileName" v-show="entry.rename" class="rename-input p-inputtext-sm"/>
          <a v-show="!entry.rename" :href="entry.filePath" @click.stop.prevent="onEntryOpen(entry, true)">{{ entry.fileName }}</a>
          <Button class="p-button-sm p-button-rounded p-button-text rename-action" icon="pi pi-pencil" v-show="editable && !entry.rename" @click.stop="onRename(entry)"/>
        </div>
        <div class="td p-d-none p-d-md-flex" style="max-width: 150px;"><span v-tooltip.top="prettyLongDate(entry.mtime)">{{ prettyDate(entry.mtime) }}</span></div>
        <div class="td p-d-none p-d-md-flex" style="max-width: 100px;">{{ prettyFileSize(entry.size) }}</div>
        <div class="td" style="min-width: 180px; justify-content: flex-end;">
          <a :href="getDirectLink(entry)" target="_blank" @click.stop>
            <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-external-link" v-tooltip.top="'Open'" v-show="!entry.rename && entry.isFile && selectedEntries.length <= 1" />
          </a>
          <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-download" v-tooltip.top="'Download'" v-show="!entry.rename && entry.isFile && selectedEntries.length <= 1" @click.stop="onDownload(entry)"/>
          <Button class="action-buttons p-button-sm p-button-rounded p-button-text p-button-danger" icon="pi pi-trash" v-tooltip.top="'Delete'" v-show="editable && !entry.rename && selectedEntries.length <= 1" @click.stop="onDelete(entry)"/>

          <Button class="action-buttons p-button-sm p-button-rounded p-button-text" :class="{ 'action-buttons-visible': entry.sharedWith.length }" icon="pi pi-share-alt" v-tooltip.top="entry.sharedWith.length ? 'Edit Shares' : 'Create Share'" v-show="editable && (entry.sharedWith.length || (shareable && !entry.rename && selectedEntries.length <= 1))" @click.stop="onShare(entry)"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { nextTick } from 'vue';
import { getPreviewUrl, prettyDate, prettyLongDate, prettyFileSize, getDirectLink, clearSelection } from '../utils.js';
import * as Combokeys from 'combokeys';

export default {
    name: 'EntryList',
    emits: [ 'selection-changed', 'entry-activated', 'entry-renamed', 'delete', 'dropped', 'entry-shared', 'download' ],
    data() {
        return {
            activeEntry: null,
            selected: [],
            selectedEntries: [],
            sort: {
                prop: 'fileName',
                desc: true
            },
            dragActive: '',
            contextMenuItem: [{
                label:'Open',
                icon:'pi pi-fw pi-external-link',
                command: () => this.onEntryOpen(this.selectedEntries[0])
            }, {
                label:'Download',
                icon:'pi pi-fw pi-download',
                visible: () => !this.selectedEntries[0].isDirectory,
                command: () => this.onDownload(this.selectedEntries[0])
            }, {
                separator: true,
                visible: () => this.editable
            }, {
                label:'Share',
                icon:'pi pi-fw pi-share-alt',
                visible: () => this.editable,
                command: () => this.onShare(this.selectedEntries[0])
            }, {
                separator: true,
                visible: () => this.editable
            }, {
                label:'Delete',
                icon:'pi pi-fw pi-trash',
                visible: () => this.editable,
                command: () => this.onDelete(this.selectedEntries[0])
            }]
        };
    },
    props: {
        emptyPlaceholder: {
            type: String,
            default: 'Folder is empty'
        },
        editable: {
            type: Boolean,
            default: false
        },
        active: {
            type: Boolean,
            default: false
        },
        shareable: {
            type: Boolean,
            default: true
        },
        entries: Array,
        sortFoldersFirst: {
            type: Boolean,
            default: true
        }
    },
    watch: {
        entries(/*val, oldVal*/) {
            this.onSelectClear();

            if (this.entries[0]) this.onEntrySelect(this.entries[0]);
        }
    },
    computed: {
        filteredAndSortedEntries: function () {
            var that = this;

            function sorting(list) {
                var tmp = list.sort(function (a, b) {
                    var av = a[that.sort.prop];
                    var bv = b[that.sort.prop];

                    if (typeof av === 'string') return (av.toUpperCase() < bv.toUpperCase()) ? -1 : 1;
                    else return (av < bv) ? -1 : 1;
                });

                if (that.sort.desc) return tmp;
                return tmp.reverse();
            }

            if (this.sortFoldersFirst) {
                return sorting(this.entries.filter(function (e) { return e.isDirectory; })).concat(sorting(this.entries.filter(function (e) { return !e.isDirectory; })));
            } else {
                return sorting(this.entries);
            }
        }
    },
    methods: {
        getDirectLink,
        getPreviewUrl,
        prettyDate,
        prettyFileSize,
        prettyLongDate,
        onEnter() {
            console.log('enter', this.active)
        },
        previewLoaded: function (entry) {
            entry.previewLoading = false;
        },
        previewError: function (entry, event) {
            entry.previewLoading = true;
            var url = new URL(event.target.src);

            setTimeout(function () {
                event.target.src = url.pathname + '?access_token=' + url.searchParams.get('access_token') + '&refresh=' + Date.now();
            }, 1000);
        },
        getEntryIdentifier(entry) {
            return (entry.share ? (entry.share.id + '/') : '') + entry.filePath;
        },
        onContextMenu(entry, $event) {
            this.onEntrySelect(entry, $event);
            this.$refs.entryListContextMenu.show($event);
        },
        onSort: function (prop) {
            if (this.sort.prop === prop) this.sort.desc = !this.sort.desc;
            else this.sort.prop = prop;
        },
        onEntrySelect: function (entry, $event) {
            const fileIdentifier = this.getEntryIdentifier(entry);

            // FIXME mac might not use ctrl Key
            if ($event && $event.ctrlKey) {
                let exists = this.selected.indexOf(fileIdentifier);
                if (exists === -1) {
                    this.selected.push(fileIdentifier);
                    this.selectedEntries.push(entry);
                } else {
                    this.selected.splice(exists, 1);
                    this.selectedEntries.splice(exists, 1);
                }
            } else {
                this.selected = [ fileIdentifier ];
                this.selectedEntries = [ entry ];
            }

            // update the last active Entry (basically the one with focus)
            this.activeEntry = entry;

            this.$emit('selection-changed', this.selectedEntries);
        },
        onSelectAll() {
            this.selected = this.entries.map(function (e) { return e.filePath; });
            this.selectedEntries = this.entries;

            this.$emit('selection-changed', this.selectedEntries);
        },
        onSelectClear() {
            this.selected = [];
            this.selectedEntries = [];
        },
        onEntryOpen: function (entry, select) {
            clearSelection();

            if (entry.rename) return;

            this.$emit('entry-activated', entry);

            if (select) this.onEntrySelect(entry);
        },
        onDownload: function (entry) {
            this.$emit('download', entry ? [ entry ] : this.selectedEntries);
        },
        onRename: function (entry) {
            if (entry.rename) {
                entry.rename = false;
                return;
            }

            entry.filePathNew = entry.fileName;
            entry.rename = true;

            nextTick(function () {
                var elem = document.getElementById('filePathRenameInputId-' + entry.fileName);
                elem.focus();

                if (typeof elem.selectionStart != "undefined") {
                    elem.selectionStart = 0;
                    elem.selectionEnd = entry.fileName.lastIndexOf('.');
                }
            });
        },
        onRenameEnd: function (entry) {
            entry.rename = false;
        },
        onRenameSubmit: function (entry) {
            entry.rename = false;

            if (entry.filePathNew === entry.fileName) return;

            this.$emit('entry-renamed', entry, entry.filePathNew);
        },
        onDelete: function (entry) {
            this.$emit('delete', entry ? [ entry ] : this.selectedEntries);
        },
        onShare: function (entry) {
            this.$emit('entry-shared', entry);
        },
        dragExit: function () {
            this.dragActive = '';
        },
        dragOver: function (entry) {
            if (!this.editable) return;

            event.dataTransfer.dropEffect = 'copy';

            if (!entry || entry.isFile) this.dragActive = 'table';
            else this.dragActive = entry;
        },
        drop: function (entry) {
            if (!this.editable) return;

            this.dragActive = '';

            if (!event.dataTransfer.items[0]) return;

            if (entry && entry.isDirectory) this.$emit('dropped', event.dataTransfer.items, entry);
            else this.$emit('dropped', event.dataTransfer.items, null);
        }
    },
    mounted() {
        var that = this;

        window.addEventListener('keydown', function (event) {
            if (!that.active) return;

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                if (that.selected.length === 0) return;

                var index = that.filteredAndSortedEntries.findIndex(function (entry) { return entry.filePath === that.selected[0]; });
                if (index === -1) return;

                if (event.key === 'ArrowUp') {
                    if (index === 0) return;
                    that.onEntrySelect(that.filteredAndSortedEntries[index-1]);
                } else {
                    if (index === that.filteredAndSortedEntries.length-1) return;
                    that.onEntrySelect(that.filteredAndSortedEntries[index+1]);
                }

                // prevents scrolling the viewport
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', function (event) {
            if (!that.active) return;

            if (event.key === 'Enter') {
                if (!that.activeEntry) return;

                that.onEntryOpen(that.activeEntry, false);

                // prevents scrolling the viewport
                event.preventDefault();
            }
        });

        var keys = new Combokeys(document.documentElement);
        keys.bind([ 'command+a', 'ctrl+a' ], function () {
            that.onSelectAll();
            return false;
        });
    }

};

</script>

<style scoped>

.loading {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
}

.table {
    display: flex;
    flex-flow: column nowrap;
    flex: 1 1 auto;
    margin: 10px;
    transition: background-color 200ms, color 200ms;
    border-radius: 3px;
}

.tbody {
    overflow-x: hidden;
    overflow-y: auto;
}

.drag-active {
    background-color: #2196f3;
    color: white;
}

.rename-input {
    width: 100%;
}

.rename-action {
    margin-left: 20px;
}

.tr .rename-action {
    visibility: hidden;
}

.tr:hover .rename-action {
    visibility: visible;
}

.th {
    font-weight: 700;
    width: 100%;
    display: flex;
    flex-flow: row nowrap;
}

.th > .td {
    white-space: normal;
    display: block;
    user-select: none;
}

.tr {
    width: 100%;
    display: flex;
    flex-flow: row nowrap;
    cursor: default;
}

.tr:hover {
    background-color: #f5f7fa;
}

.action-buttons {
    visibility: hidden;
}

.tr:hover .action-buttons,
.tr.selected .action-buttons {
    visibility: visible;
}

.action-buttons-visible {
    visibility: visible;
}

.tr.selected {
    background-color: #dbedfb;
}

.tr-placeholder {
    width: 100%;
    text-align: center;
    margin-top: 20vh;
}

.td > a {
    color: inherit;
    margin: auto 0px;
}

.td > a:hover {
    text-decoration: underline;
}

.td {
    display: flex;
    flex-flow: row nowrap;
    flex-grow: 1;
    flex-basis: 0;
    padding: 0.2em;
    min-width: 0px;
    margin: auto;
}

.tr > .td.icon {
    max-width: 40px;
}

.tr > .td.icon > img {
    width: 24px;
    height: 24px;
    vertical-align: middle;
}

.hand {
    cursor: pointer;
}

</style>
