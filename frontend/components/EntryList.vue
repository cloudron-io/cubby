<template>
  <ContextMenu ref="entryListContextMenu" :model="contextMenuItem" />

  <div class="loading" v-show="$parent.busy">
    <i class="pi pi-spin pi-spinner" style="fontSize: 2rem"></i>
  </div>
  <div v-cloak v-show="!$parent.busy" class="list-container" :class="{ 'drag-active': dragActive === 'table' }" @drop.stop.prevent="onDrop(null)" @dragover.stop.prevent="onDragOver(null)" @dragexit="onDragExit">
    <table>
      <thead>
        <tr>
          <th style="height: 40px;"></th>
          <th class="hand" style="" @click="onSort('fileName')">Name <i class="pi" :class="{'pi-sort-alpha-down': sort.desc, 'pi-sort-alpha-up-alt': !sort.desc }" v-show="sort.prop === 'fileName'"></i></th>
          <th class="hand" style="max-width: 150px;" @click="onSort('mtime')">Updated <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'mtime'"></i></th>
          <th class="hand" style="max-width: 100px;" @click="onSort('size')">Size <i class="pi" :class="{'pi-sort-numeric-down': sort.desc, 'pi-sort-numeric-up-alt': !sort.desc }" v-show="sort.prop === 'size'"></i></th>
          <th style="min-width: 180px"></th>
        </tr>
      </thead>
      <tbody>
        <tr colspan="5" v-show="entries.length === 0">{{ emptyPlaceholder }}</tr>
        <tr colspan="5" v-show="entries.length !== 0 && filteredAndSortedEntries.length === 0">Nothing found</tr>
        <template v-for="entry in filteredAndSortedEntries">
          <EntryListItem :entry="entry" :selected="selected" :selectedEntries="selectedEntries"
            @entry-open="onEntryOpen"
            @entry-select="onEntrySelect"
            @context-menu="onContextMenu"
            @share="onShare"
            @drop="onDrop"
            @drag-over="onDragOver"
          />
        </template>
      </tbody>
    </table>
  </div>
</template>

<script>

import { nextTick } from 'vue';
import { getPreviewUrl, prettyDate, prettyLongDate, prettyFileSize, getDirectLink, clearSelection, getEntryIdentifier } from '../utils.js';
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
        getEntryIdentifier,
        onEnter() {
            console.log('enter', this.active)
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

            console.log('---', entry)

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

.list-container {
  width: 100%;
  height: 100%;
  transition: background-color 200ms, color 200ms;
  border-radius: 3px;
}

.drag-active {
  background-color: #2196f3;
  color: white;
}

table {
  width: 100%;
  border-collapse: collapse;
  padding: 10px 0;
}

th {
  text-align: left;
}

thead {
  position: sticky;
  top: 0px;
  background-color: white;
  z-index: 20;
}

.drag-active thead {
  background-color: transparent;
}

.hand {
    cursor: pointer;
}

</style>
