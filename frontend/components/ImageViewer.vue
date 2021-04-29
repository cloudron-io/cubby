<template>
    <div class="container" ref="imageContainer" tabindex="0" @click="onClose" @keydown.escape="onClose" @keydown.right="onNext" @keydown.left="onPrev" @keydown.down="onNext" @keydown.up="onPrev">
        <div ref="image" class="image"></div>
        <Button class="p-button-rounded p-button-outlined p-button-secondary close-button" icon="pi pi-times" @click="onClose"/>
    </div>
</template>

<script>

import { getDirectLink, getFileTypeGroup } from '../utils.js';

export default {
    name: 'ImageViewer',
    emits: [ 'close' ],
    data() {
        return {
            currentIndex: 0
        };
    },
    props: {
        entries: Array
    },
    methods: {
        canHandle(entry) {
            return getFileTypeGroup(entry) === 'image';
        },
        open(entry) {
            if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(entry) + '")';
            this.currentIndex = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; }).findIndex(function (e) { return e.fileName === entry.fileName; });

            // TODO come up with something better here
            setTimeout(() => this.$refs.imageContainer.focus(), 1000);
        },
        onClose() {
            this.$emit('close');
        },
        onNext() {
            var images = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; });
            if (images.length <= 1) return;

            if (this.currentIndex >= images.length-1) return;

            this.currentIndex += 1;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(images[this.currentIndex]) + '")';
        },
        onPrev() {
            var images = this.entries.filter(function (e) { return getFileTypeGroup(e) === 'image'; });
            if (images.length <= 1) return;

            if (this.currentIndex <= 0) return;

            this.currentIndex -= 1;

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
    background-color: rgba(0,0,0,0.8);
}

.image {
    width: 100%;
    height: 100%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 35px;
}

</style>
