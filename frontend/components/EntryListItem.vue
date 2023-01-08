<template>
    <div class="entry-row" :key="entry.id" @contextmenu="onContextMenu($event)" @dblclick="onEntryOpen(false)" @click="onEntrySelect($event)" @drop.stop.prevent="onDrop()" @dragexit.stop.prevent="onDragExit()" @dragover.stop.prevent="onDragOver()" :class="{ 'selected': entry.selected, 'drag-active': dragActive }">
      <div v-if="!isVisible()" class="entry-cell icon"></div>
      <div v-if="!isVisible()" class="entry-cell filename">
        <a v-show="!entry.rename" :href="entry.filePath" @click.stop.prevent="onEntryOpen(true)">{{ entry.fileName }}</a>
      </div>

      <div v-if="isVisible()" class="entry-cell icon"><img :src="getPreviewUrl(entry)" @load="previewLoaded()" @error="previewError($event)" style="object-fit: cover;" v-show="!entry.previewLoading"/><i class="pi pi-spin pi-spinner" v-show="entry.previewLoading"></i></div>
      <div v-if="isVisible()" class="entry-cell filename">
        <InputText @click.stop @keyup.enter.stop="onRenameSubmit()" @keyup.esc="onRenameEnd()" @blur="onRenameEnd()" v-model="entry.filePathNew" v-show="entry.rename" class="rename-input p-inputtext-sm"/>
        <a v-show="!entry.rename" :href="entry.filePath" @click.stop.prevent="onEntryOpen(true)">{{ entry.fileName }}</a>
        <Button class="p-button-sm p-button-rounded p-button-text rename-action" style="vertical-align: middle;" icon="pi pi-pencil" v-show="editable && !entry.rename && !entry.isShare" @click.stop="onRenameStart()"/>
      </div>
      <div v-if="isVisible()" class="entry-cell mtime" v-tooltip.top="prettyLongDate(entry.mtime)">{{ prettyDate(entry.mtime) }}</div>
      <div v-if="isVisible()" class="entry-cell size">{{ prettyFileSize(entry.size) }}</div>
      <div v-if="isVisible()" class="entry-cell actions">
        <a :href="getDirectLink(entry)" target="_blank" @click.stop>
          <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-external-link" v-tooltip.top="'Open'" v-show="!entry.rename && entry.isFile && !multi" />
        </a>
        <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-download" v-tooltip.top="'Download'" v-show="!entry.rename && entry.isFile && !multi" @click.stop="onDownload(entry)"/>
        <Button class="action-buttons p-button-sm p-button-rounded p-button-text p-button-danger" icon="pi pi-trash" v-tooltip.top="'Delete'" v-show="editable && !entry.rename && !multi" @click.stop="onDelete(entry)"/>

        <Button class="action-buttons p-button-sm p-button-rounded p-button-text" :class="{ 'action-buttons-visible': entry.sharedWith.length }" icon="pi pi-share-alt" v-tooltip.top="entry.sharedWith.length ? 'Edit Shares' : 'Create Share'" v-show="editable && (entry.sharedWith.length || (shareable && !entry.rename)) && !multi" @click.stop="onShare()"/>
      </div>
    </div>
</template>

<script>

import { nextTick } from 'vue';
import { getDirectLink, prettyLongDate, prettyDate, prettyFileSize, getPreviewUrl } from '../utils.js';

export default {
    name: 'EntryListItem',
    emits: [ 'delete', 'share', 'rename-submit', 'entry-open', 'entry-select', 'context-menu', 'drag-exit', 'drag-active', 'drop' ],
    props: {
        entry: {
            type: Object,
            default: () => { return {}; }
        },
        editable: {
            type: Boolean,
            default: true
        },
        shareable: {
            type: Boolean,
            default: true
        },
        multi: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            visible: false,
            dragActive: false
        };
    },
    methods: {
        prettyLongDate,
        prettyDate,
        getPreviewUrl,
        prettyFileSize,
        getDirectLink,
        isVisible() {
            return this.visible;
        },
        onRenameStart() {
            var that = this;

            this.entry.rename = true;

            nextTick(function () {
                var elem = that.$el.querySelector('input');
                elem.focus();

                if (typeof elem.selectionStart != "undefined") {
                    elem.selectionStart = 0;
                    elem.selectionEnd = that.entry.fileName.lastIndexOf('.');
                }
            });
        },
        onRenameEnd() {
            this.entry.rename = false;
        },
        onRenameSubmit() {
            this.entry.rename = false;
            this.$emit('rename-submit', this.entry);
        },
        onEntryOpen(select) {
            this.$emit('entry-open', this.entry, select);
        },
        onEntrySelect($event) {
            this.$emit('entry-select', this.entry, $event);
        },
        onContextMenu($event) {
            this.$emit('context-menu', this.entry, $event);
        },
        onDragExit() {
            this.dragActive = false;
        },
        onDragOver() {
            this.dragActive = true;
            this.$emit('drag-over', this.entry);
        },
        onDrop() {
            this.dragActive = false;
            this.$emit('drop', this.entry);
        },
        onShare() {
            this.$emit('share', this.entry);
        },
        onDelete() {
            this.$emit('delete', this.entry);
        },
        previewLoaded() {
            this.entry.previewLoading = false;
        },
        previewError(event) {
            this.entry.previewLoading = true;
            var url = new URL(event.target.src);

            setTimeout(function () {
                event.target.src = url.pathname + '?refresh=' + Date.now();
            }, 1000);
        }
    },
    mounted() {
        let that = this;

        let observer = new IntersectionObserver(function (result) {
            if (result[0].isIntersecting) {
                that.visible = true;
                observer.unobserve(that.$el);
            }
        });

        observer.observe(that.$el);
    }
};

</script>

<style scoped>

.entry-row {
    display: flex;
    width: 100%;
    border-radius: 3px;
}

.entry-row:hover {
    background-color: #f5f7fa;
}

.entry-cell {
    display: block;
    height: 40px;
    line-height: 40px;
}

.entry-cell.icon {
    padding: 4px;
    width: 50px;
    height: 40px;
    line-height: normal;
}

.entry-cell.filename {
    flex-grow: 1;
}

.entry-cell.filename > a {
    color: inherit;
    margin: auto 0px;
}

.entry-cell.filename > a:hover {
    text-decoration: underline;
}

.entry-cell.mtime {
    width: 130px;
}

.entry-cell.size {
    width: 130px;
    text-align: right;
}

.entry-cell.actions {
    width: 160px;
    text-align: right;
    line-height: normal;
}

.action-buttons {
    visibility: hidden;
}

.entry-row:hover .action-buttons,
.entry-row.selected .action-buttons {
    visibility: visible;
}

.action-buttons-visible {
    visibility: visible;
}

.entry-row.selected {
    background-color: #dbedfb;
}

.drag-active .entry-row.selected {
    background-color: unset;
}

.rename-input {
    width: 100%;
}

.rename-action {
    margin-left: 20px;
}

.entry-row .rename-action {
    visibility: hidden;
}

.entry-row:hover .rename-action {
    visibility: visible;
}

.icon > img {
    width: 32px;
    height: 32px;
    vertical-align: middle;
}

</style>
