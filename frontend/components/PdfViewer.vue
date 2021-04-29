<template>
    <div class="container">
        <Toolbar>
            <template #left>
                <div>{{ entry ? entry.fileName : '' }}</div>
            </template>

            <template #right>
                <Button icon="pi pi-times" class="p-ml-2 p-button-sm" label="Close" @click="onClose"/>
            </template>
        </Toolbar>
        <div ref="pdfView" class="pdf-viewer-container">
            <div id="viewer" class="pdfViewer"></div>
        </div>
    </div>
</template>

<script>

import pdfjsLib from "pdfjs-dist/build/pdf";
import { PDFViewer } from "pdfjs-dist/web/pdf_viewer";
import "pdfjs-dist/web/pdf_viewer.css";
import { encode } from '../utils.js';

export default {
    name: 'PdfViewer',
    emits: [ 'close' ],
    data() {
        return {
        };
    },
    props: {
        entry: Object,
        entries: Array
    },
    watch: {
        async entry(newEntry) {
            if (!newEntry || newEntry.isDirectory) return;

            var loadingTask = pdfjsLib.getDocument('/api/v1/files?type=raw&access_token=' + localStorage.accessToken + '&path=' + encode(newEntry.filePath));
            var pdf = await loadingTask.promise;
            this.pdfViewer.setDocument(pdf);
        }
    },
    methods: {
        onClose() {
            this.$emit('close');
        }
    },
    mounted() {
        this.pdfViewer = new PDFViewer({ container: this.$refs.pdfView });
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
    background: black;
    display: flex;
    flex-direction: column;
}

.pdf-viewer-container {
    width: 100%;
    height: 100%;
    overflow: auto;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 35px;
}

</style>
