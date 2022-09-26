<template>
    <tr class="entry" :key="entry.id" @contextmenu="onContextMenu($event)" @dblclick="onEntryOpen(false)" @click="onEntrySelect($event)" @drop.stop.prevent="onDrop()" @dragexit.stop.prevent="onDragExit()" @dragover.stop.prevent="onDragOver()" :class="{ 'selected': entry.selected, 'drag-active': dragActive }">
      <td v-if="!isVisible()" class="icon" style="width: 40px; height: 40px;"></td>
      <td v-if="!isVisible()" colspan="4" style="height: 40px;">
        <a v-show="!entry.rename" :href="entry.filePath" @click.stop.prevent="onEntryOpen(true)">{{ entry.fileName }}</a>
      </td>

      <td v-if="isVisible()" class="icon" style="width: 40px; height: 40px;"><img :src="getPreviewUrl(entry)" @load="previewLoaded()" @error="previewError($event)" style="object-fit: cover;" v-show="!entry.previewLoading"/><i class="pi pi-spin pi-spinner" v-show="entry.previewLoading"></i></td>
      <td v-if="isVisible()">
        <InputText @click.stop @keyup.enter="onRenameSubmit()" @keyup.esc="onRenameEnd()" @blur="onRenameEnd()" v-model="entry.filePathNew" :id="'filePathRenameInputId-' + entry.fileName" v-show="entry.rename" class="rename-input p-inputtext-sm"/>
        <a v-show="!entry.rename" :href="entry.filePath" @click.stop.prevent="onEntryOpen(true)">{{ entry.fileName }}</a>
        <Button class="p-button-sm p-button-rounded p-button-text rename-action" style="vertical-align: middle;" icon="pi pi-pencil" v-show="editable && !entry.rename" @click.stop="onRenameStart()"/>
      </td>
      <td v-if="isVisible()" style="max-width: 150px;"><span v-tooltip.top="prettyLongDate(entry.mtime)">{{ prettyDate(entry.mtime) }}</span></td>
      <td v-if="isVisible()" style="max-width: 100px;">{{ prettyFileSize(entry.size) }}</td>
      <td v-if="isVisible()" style="min-width: 180px; text-align: right;">
        <a :href="getDirectLink(entry)" target="_blank" @click.stop>
          <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-external-link" v-tooltip.top="'Open'" v-show="!entry.rename && entry.isFile" />
        </a>
        <Button class="action-buttons p-button-sm p-button-rounded p-button-text" icon="pi pi-download" v-tooltip.top="'Download'" v-show="!entry.rename && entry.isFile" @click.stop="onDownload(entry)"/>
        <Button class="action-buttons p-button-sm p-button-rounded p-button-text p-button-danger" icon="pi pi-trash" v-tooltip.top="'Delete'" v-show="editable && !entry.rename" @click.stop="onDelete(entry)"/>

        <Button class="action-buttons p-button-sm p-button-rounded p-button-text" :class="{ 'action-buttons-visible': entry.sharedWith.length }" icon="pi pi-share-alt" v-tooltip.top="entry.sharedWith.length ? 'Edit Shares' : 'Create Share'" v-show="editable && (entry.sharedWith.length || (shareable && !entry.rename))" @click.stop="onShare()"/>
      </td>
    </tr>
</template>

<script>

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
            this.entry.rename = true;
        },
        onRenameEnd() {
            this.entry.rename = false;
        },
        onRenameSubmit() {
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

.entry:hover {
    background-color: #f5f7fa;
}

.action-buttons {
    visibility: hidden;
}

.entry:hover .action-buttons,
.entry.selected .action-buttons {
    visibility: visible;
}

.action-buttons-visible {
    visibility: visible;
}

.entry.selected {
    background-color: #dbedfb;
}


.drag-active .entry.selected {
  background-color: unset;
}

.rename-input {
    width: 100%;
}

.rename-action {
    margin-left: 20px;
}

tr .rename-action {
    visibility: hidden;
}

tr:hover .rename-action {
    visibility: visible;
}

th > td {
    white-space: normal;
    display: block;
    user-select: none;
}

.tr-placeholder {
    width: 100%;
    text-align: center;
    margin-top: 20vh;
}

td > a {
    color: inherit;
    margin: auto 0px;
}

td > a:hover {
    text-decoration: underline;
}

.icon {
    padding: 4px;
    max-width: 40px;
}

.icon > img {
    width: 32px;
    height: 32px;
    vertical-align: middle;
}


</style>
