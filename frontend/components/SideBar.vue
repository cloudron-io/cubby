<template>
    <div class="container" :class="{ 'visible': visible }">
        <div class="p-d-flex p-jc-between header" style="padding-bottom: 10px;">
          Details
        </div>
        <center>
          <Button class="p-button-sm p-button-outlined" v-show="entry.isFile" label="Download" icon="pi pi-download" style="margin: 10px;" @click="onDownload(entry)"/>
          <a :href="entry.filePath" target="_blank">
            <Button class="p-button-sm p-button-outlined" label="Open" icon="pi pi-external-link" style="margin: 10px;"/>
          </a>
          <Button class="p-button-sm p-button-outlined" label="Copy Link" icon="pi pi-copy" style="margin: 10px;" @click="onCopyLink(entry)"/>
        </center>
    </div>
</template>

<script>

import { download, encode, copyToClipboard } from '../utils.js';

export default {
    name: 'SideBar',
    emits: [],
    data() {
        return {};
    },
    props: {
        entry: Object,
        visible: Boolean
    },
    watch: {
        entry(newEntry) {
            console.log(newEntry)
        }
    },
    methods: {
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
    transition: width 200ms;
    padding: 0;
    border-left: 1px solid #f8f9fa;
}

.container.visible {
    padding: 10px 10px 0px 10px;
    width: 20%;
    min-width: 200px;
}

.header {
    text-align: left;
    border-bottom: solid 2px #2196f3;
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
