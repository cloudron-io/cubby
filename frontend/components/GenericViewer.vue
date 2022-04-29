<template>
    <div class="container">
        <Toolbar>
            <template #start>
                <div>{{ entry ? entry.fileName : '' }}</div>
            </template>

            <template #end>
                <Button icon="pi pi-times" class="p-ml-2 p-button-sm" label="Close" @click="onClose"/>
            </template>
        </Toolbar>
        <div class="content">
            <h1>{{ entry ? entry.fileName: '' }}</h1>
            <Button class="p-ml-2 p-button-sm" label="Close" @click="onClose"/>
        </div>
    </div>
</template>

<script>

import { getDirectLink } from '../utils.js';

export default {
    name: 'GenericViewer',
    emits: [ 'close' ],
    data() {
        return {
            entry: null
        };
    },
    methods: {
        async open(entry) {
            if (!entry) return;

            this.entry = entry;

            window.open(getDirectLink(entry));
        },
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
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 35px;
}

.p-toolbar {
    padding: 5px 1rem;
}

.content {
    width: 100%;
    height: 100%;
    text-align: center;
}

</style>
