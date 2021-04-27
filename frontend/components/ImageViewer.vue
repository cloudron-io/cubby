<template>
    <div class="container" @click="onClose">
        <div ref="image" class="image"></div>
    </div>
</template>

<script>

import { getDirectLink } from '../utils.js';

export default {
    name: 'ImageViewer',
    emits: [],
    data() {
        return {};
    },
    props: {
        entry: Object
    },
    watch: {
        entry(newEntry) {
            if (!newEntry || newEntry.isDirectory) return;

            this.$refs.image.style.backgroundImage = 'url("' + getDirectLink(newEntry) + '")';
        }
    },
    methods: {
        onClose() {
            this.$emit('close');
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
