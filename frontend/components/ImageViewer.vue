<template>
    <div class="container" ref="imageContainer" tabindex="0" @keydown.escape="onClose" @keydown.right="onNext" @keydown.left="onPrev" @keydown.down="onNext" @keydown.up="onPrev">
        <div ref="image" class="image"></div>
        <div class="action-nav action-download" @click="onDownload" v-tooltip.right="'Download'"><i class="pi pi-download" style="fontSize: 2rem"></i></div>
        <div class="action-nav action-close" @click="onClose" v-tooltip.left="'Close'"><i class="pi pi-times" style="fontSize: 2rem"></i></div>
        <div class="action-nav action-prev" @click="onPrev" v-tooltip.right="'Previous'"><i class="pi pi-chevron-left" style="fontSize: 2rem"></i></div>
        <div class="action-nav action-next" @click="onNext" v-tooltip.left="'Next'"><i class="pi pi-chevron-right" style="fontSize: 2rem"></i></div>
    </div>
</template>

<script>

import superagent from 'superagent';
import { getDirectLink, getFileTypeGroup } from '../utils.js';

export default {
    name: 'ImageViewer',
    emits: [ 'close', 'download' ],
    data() {
        return {
            currentIndex: 0,
            entry: {},
            entries: []
        };
    },
    methods: {
        canHandle(entry) {
            return getFileTypeGroup(entry) === 'image';
        },
        open(entry) {
            const that = this;

            if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(entry) + '")';
            this.currentIndex = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; }).findIndex(function (e) { return e.fileName === entry.fileName; });
            this.entry = entry;
            this.entries = [];

            // TODO come up with something better here
            setTimeout(() => this.$refs.imageContainer.focus(), 1000);

            // TODO support shares here apiPath wise
            const folderPath = entry.filePath.slice(0, -entry.fileName.length);
            superagent.get('/api/v1/files').query({ path: folderPath, access_token: localStorage.accessToken }).end(function (error, result) {
                if (error) return console.error('Failed to load directory:', error);

                that.entries = result.body.files;
            });
        },
        onDownload() {
            this.$emit('download', [ this.entry ]);
        },
        onClose() {
            this.$emit('close');
        },
        onNext() {
            var images = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; });
            if (images.length <= 1) return;

            if (this.currentIndex >= images.length-1) return;

            this.currentIndex += 1;
            this.entry = images[this.currentIndex];

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(images[this.currentIndex]) + '")';
        },
        onPrev() {
            var images = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; });
            if (images.length <= 1) return;

            if (this.currentIndex <= 0) return;

            this.currentIndex -= 1;
            this.entry = images[this.currentIndex];

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(images[this.currentIndex]) + '")';
        }
    },
    mounted() {
    }
};

</script>

<style scoped>

.container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: black;
}

.image {
    width: 100%;
    height: 100%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
}

.action-nav {
    display: flex;
    justify-content: center;
    flex-direction: column;
    position: absolute;
    top: 50%;
    height: 60px;
    width: 60px;
    background-color: #222;
    opacity: 0;
    cursor: pointer;
    text-align: center;
    transition: opacity 250ms;
    color: #9f9f9f;
}

.container:hover .action-nav {
    opacity: 0.4;
}

.action-nav:hover {
    opacity: 1 !important;
}

.action-close {
    top: 0;
    right: 0;
}

.action-prev {
    left: 0;
    height: 80px;
}

.action-next {
    right: 0;
    height: 80px;
}

.action-download {
    left: 0;
    top: 0;
}

</style>
