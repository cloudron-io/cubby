<template>
    <div class="container" :class="{ 'visible': visible }">
      <div class="p-d-flex p-jc-between header" style="padding-bottom: 10px;">Details</div>
      <div class="preview" :style="{ backgroundImage: entry && entry.previewUrl ? 'url(' + entry.previewUrl + ')' : 'none' }"></div>
      <div class="detail">
        <p>Owner</p>
        <span>Admin</span>
      </div>
      <div class="detail">
        <p>Updated</p>
        <span>{{ prettyLongDate(entry.mtime) }}</span>
      </div>
      <div class="detail">
        <p>Size</p>
        <span>{{ prettyFileSize(entry.size) }}</span>
      </div>
      <div class="detail">
        <p>Type</p>
        <span>{{ entry.mimeType }}</span>
      </div>
    </div>
</template>

<script>

import { download, encode, copyToClipboard, prettyLongDate, prettyFileSize } from '../utils.js';

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
        }
    },
    methods: {
        prettyLongDate,
        prettyFileSize,
        onDownload: function (entry) {
            download(entry);
        },
        onCopyLink: function (entry) {
            copyToClipboard(location.origin + encode(entry.filePath));

            this.$toast.add({ severity:'success', summary: 'Link copied to Clipboard', life: 1500 });
        }
    },
    mounted() {
    }
};

</script>

<style scoped>

.container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    width: 0;
    transition: width ease-in 300ms;
    border-left: 1px solid #f8f9fa;
}

.container.visible {
    width: 350px;
}

.preview {
    width: 100%;
    height: 250px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
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
