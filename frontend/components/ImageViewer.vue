<template>
    <div class="container" ref="imageContainer" tabindex="0" @click="onClose" @keydown.escape="onClose" @keydown.right="onNext" @keydown.left="onPrev" @keydown.down="onNext" @keydown.up="onPrev">
        <div ref="image" class="image"></div>
    </div>
</template>

<script>

import { getDirectLink, getFileType, FILE_TYPES } from '../utils.js';

export default {
    name: 'ImageViewer',
    emits: [],
    data() {
        return {
            currentIndex: 0
        };
    },
    props: {
        entry: Object,
        entries: Array
    },
    watch: {
        entry(newEntry) {
            if (!newEntry || newEntry.isDirectory) return;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(newEntry) + '")';
            this.currentIndex = this.entries.filter(function (e) { return getFileType(e) === FILE_TYPES.image; }).findIndex(function (e) { return e.fileName === newEntry.fileName; });

            // TODO come up with something better here
            setTimeout(() => this.$refs.imageContainer.focus(), 1000);
        }
    },
    methods: {
        onClose() {
            this.$emit('close');
        },
        onNext() {
            var images = this.entries.filter(function (e) { return getFileType(e) === FILE_TYPES.image; });
            if (images.length <= 1) return;

            if (this.currentIndex >= images.length-1) return;

            this.currentIndex += 1;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(images[this.currentIndex]) + '")';
        },
        onPrev() {
            var images = this.entries.filter(function (e) { return getFileType(e) === FILE_TYPES.image; });
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

</style>
