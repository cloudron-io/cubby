<template>
    <div class="sidebar-container" :class="{ 'visible': visible }">
      <div class="p-d-flex p-jc-between header" style="padding-bottom: 10px;">Details</div>
      <div class="preview-container">
        <div class="preview" v-for="entry in selectedEntries" :key="entry.id" :style="{ backgroundImage: entry && getPreviewUrl(entry) ? 'url(' + getPreviewUrl(entry) + ')' : 'none' }"></div>
      </div>
      <div class="detail" v-show="selectedEntries.length === 1">
        <p>Owner</p>
        <span>{{ entry.owner }}</span>
      </div>
      <div class="detail" v-show="selectedEntries.length === 1">
        <p>Updated</p>
        <span>{{ prettyLongDate(entry.mtime) }}</span>
      </div>
      <div class="detail" v-show="selectedEntries.length > 1">
        <p>{{ selectedEntries.length }} files selected</p>
      </div>
      <div class="detail" v-show="selectedEntries.length">
        <p>Size</p>
        <span>{{ prettyFileSize(combinedSize) }}</span>
      </div>
      <div class="detail" v-show="selectedEntries.length === 1">
        <p>Type</p>
        <span >{{ entry.mimeType }}</span>
      </div>
    </div>
</template>

<script>

import { getPreviewUrl, prettyLongDate, prettyFileSize } from '../utils.js';

export default {
    name: 'SideBar',
    emits: [ 'close' ],
    data() {
        return {};
    },
    props: {
        selectedEntries: {
            type: Array,
            default: function () { return  []; }
        },
        visible: Boolean
    },
    computed: {
        entry() {
            return this.selectedEntries[0] || {};
        },
        combinedSize() {
            return this.selectedEntries.reduce(function (acc, val) { return acc + val.size; }, 0);
        }
    },
    methods: {
        prettyLongDate,
        prettyFileSize,
        getPreviewUrl,
    },
    mounted() {
    }
};

</script>

<style scoped>

.sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    width: 0;
    transition: width ease-in 300ms;
    border-left: 1px solid #f8f9fa;
}

.sidebar-container.visible {
    width: 350px;
}

.preview-container {
    display: flex;
    width: 100%;
    height: 250px;
    flex-direction: row;
    flex-wrap: wrap-reverse;
}

.preview {
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    flex-grow: 1;
    min-width: 64px;
    min-height: 64px;
}

.header {
    padding: 10px;
    text-align: left;
    border-bottom: solid 2px #2196f3;
}

.detail > p {
    color: #888;
    margin-bottom: 5px;
}

.detail {
    margin-bottom: 15px;
    padding-left: 10px;
}

@media only screen and (max-width: 767px)  {
    .container.visible {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
    }
}

</style>
