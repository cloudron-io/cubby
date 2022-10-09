<template>
  <ContextMenu ref="entryListContextMenu" :model="contextMenuItem" />

  <div class="loading" v-show="$parent.busy">
    <i class="pi pi-spin pi-spinner" style="fontSize: 2rem"></i>
  </div>
  <div v-cloak v-show="!$parent.busy" class="list-container" :class="{ 'drag-active': dragActive === 'table' }" @drop.stop.prevent="onDrop(null)" @dragover.stop.prevent="onDragOver(null)" @dragexit="onDragExit">
    <div class="list-header">
      <div class="list-header-cell icon"></div>
      <div class="list-header-cell filename hand" @click="onSort('fileName')">Name <i class="pi" :class="{'pi-sort-alpha-down': sort.desc, 'pi-sort-alpha-up-alt': !sort.desc }" v-show="sort.prop === 'fileName'"></i></div>
      <div class="list-header-cell mtime hand" @click="onSort('mtime')">Updated <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'mtime'"></i></div>
      <div class="list-header-cell size hand" @click="onSort('size')">Size <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'size'"></i></div>
      <div class="list-header-cell actions"></div>
    </div>
    <div class="list-body">
      <div class="empty-placeholder" v-show="entries.length === 0">{{ emptyPlaceholder }}</div>
      <div class="empty-filter-placeholder" v-show="entries.length !== 0 && filteredAndSortedEntries.length === 0">Nothing found</div>
      <template v-for="entry in filteredAndSortedEntries">
        <EntryListItem :entry="entry" :editable="editable" :shareable="shareable"
          @entry-open="onEntryOpen"
          @entry-select="onEntrySelect"
          @context-menu="onContextMenu"
          @share="onShare"
          @delete="onDelete"
          @drop="onDrop"
          @drag-over="onDragOver"
        />
      </template>
    </div>
  </div>
</template>

<script>

import { nextTick } from 'vue';
import { getPreviewUrl, prettyDate, prettyLongDate, prettyFileSize, getDirectLink, clearSelection, getEntryIdentifier, entryListSort } from '../utils.js';
import * as Combokeys from 'combokeys';

export default {
    name: 'EntryList',
    emits: [ 'selection-changed', 'entry-activated', 'entry-renamed', 'delete', 'dropped', 'entry-shared', 'download' ],
    data() {
        return {
            activeEntry: null,
            sort: {
                prop: 'fileName',
                desc: true
            },
            dragActive: '',
            contextMenuItem: [{
                label:'Open',
                icon:'pi pi-fw pi-external-link',
                command: () => this.onEntryOpen(this.activeEntry)
            }, {
                label:'Download',
                icon:'pi pi-fw pi-download',
                visible: () => !this.activeEntry.isDirectory,
                command: () => this.onDownload(this.activeEntry)
            }, {
                separator: true,
                visible: () => this.editable
            }, {
                label:'Share',
                icon:'pi pi-fw pi-share-alt',
                visible: () => this.editable,
                command: () => this.onShare(this.activeEntry)
            }, {
                separator: true,
                visible: () => this.editable
            }, {
                label:'Delete',
                icon:'pi pi-fw pi-trash',
                visible: () => this.editable,
                command: () => this.onDelete(this.activeEntry)
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

            if (this.sortFoldersFirst) {
                const sortedFolders = entryListSort(this.entries.filter(function (e) { return e.isDirectory; }), that.sort.prop, that.sort.desc);
                const sortedFiles = entryListSort(this.entries.filter(function (e) { return !e.isDirectory; }), that.sort.prop, that.sort.desc);
                return sortedFolders.concat(sortedFiles);
            } else {
                return entryListSort(this.entries, that.sort.prop, that.sort.desc);
            }
        }
    },
    methods: {
        getDirectLink,
        getPreviewUrl,
        prettyDate,
        prettyFileSize,
        prettyLongDate,
        getEntryIdentifier,
        onContextMenu(entry, $event) {
            this.onEntrySelect(entry, $event);
            this.$refs.entryListContextMenu.show($event);
        },
        onSort: function (prop) {
            if (this.sort.prop === prop) this.sort.desc = !this.sort.desc;
            else this.sort.prop = prop;
        },
        onEntrySelect: function (entry, $event) {
            // FIXME mac might not use ctrl Key
            if ($event && $event.ctrlKey) {
                entry.selected = !entry.selected;
            } else {
                // clear all selection
                this.entries.forEach(function (e) { e.selected = false; });
                entry.selected = true;
            }

            // update the last active Entry (basically the one with focus)
            this.activeEntry = entry;

            this.$emit('selection-changed', this.entries.filter(function (e) { return e.selected; }));
        },
        onSelectAll() {
            this.entries.forEach(function (e) { e.selected = true; });

            this.$emit('selection-changed', this.entries.filter(function (e) { return e.selected; }));
        },
        onSelectClear() {
            this.entries.forEach(function (e) { e.selected = false; });
        },
        onEntryOpen: function (entry, select) {
            clearSelection();

            if (entry.rename) return;

            this.$emit('entry-activated', entry);

            if (select) this.onEntrySelect(entry);
        },
        onDownload: function (entry) {
            this.$emit('download', entry ? [ entry ] : this.entries.filter(function (e) { return e.selected; }));
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
            this.$emit('delete', entry ? [ entry ] : this.entries.filter(function (e) { return e.selected; }));
        },
        onShare: function (entry) {
            this.$emit('entry-shared', entry);
        },
        onDragExit: function () {
            this.dragActive = '';
        },
        onDragOver: function (entry) {
            if (!this.editable) return;

            event.dataTransfer.dropEffect = 'copy';

            if (!entry || entry.isFile) this.dragActive = 'table';
            else this.dragActive = entry;
        },
        onDrop: function (entry) {
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
                var index = that.filteredAndSortedEntries.findIndex(function (entry) { return entry.filePath === that.activeEntry.filePath; });
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

.list-container {
    width: 100%;
    height: 100%;
    transition: background-color 200ms, color 200ms;
    border-radius: 3px;
    position: absolute;
    padding: 0 5px;
    left: 0;
}

.drag-active {
    background-color: #2196f3;
    color: white;
}

.list-header {
    display: flex;
    width: 100%;
    position: sticky;
    top: 0px;
    background-color: white;
    z-index: 20;
}

.list-header-cell {
    height: 40px;
    line-height: 40px;
}

.list-header-cell.icon {
    width: 50px;
}

.list-header-cell.filename {
    flex-grow: 1;
}

.list-header-cell.mtime {
    width: 130px;
}

.list-header-cell.size {
    width: 130px;
    text-align: right;
}

.list-header-cell.actions {
    width: 160px;
}

.empty-placeholder {
    text-align: center;
    margin-top: 100px;
}

.drag-active thead {
    background-color: transparent;
}

.hand {
    cursor: pointer;
}

</style>
