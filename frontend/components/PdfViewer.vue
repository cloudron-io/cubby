<template>
    <div class="container">
        <Toolbar>
            <template #start>
                <div>{{ entry ? entry.fileName : '' }}</div>
            </template>

            <template #end>
                <Button icon="pi pi-times" class="p-button-sm" label="Close" @click="onClose"/>
            </template>
        </Toolbar>
        <div ref="pdfView" class="pdf-viewer-container">
            <div id="viewer" class="pdfViewer"></div>
        </div>
    </div>
</template>

<script>

const pdfjs = require('pdfjs-dist');

const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { EventBus, PDFViewer, PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.js';
import 'pdfjs-dist/web/pdf_viewer.css';

import { getDirectLink } from '../utils.js';

export default {
    name: 'PdfViewer',
    emits: [ 'close' ],
    data() {
        return {
            entry: null
        };
    },
    methods: {
        canHandle(entry) {
            return entry.mimeType === 'application/pdf';
        },
        async open(entry) {
            if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

            this.entry = entry;

            var loadingTask = pdfjs.getDocument(getDirectLink(entry));
            var pdf = await loadingTask.promise;
            this.pdfViewer.setDocument(pdf);
        },
        onClose() {
            this.$emit('close');
        }
    },
    mounted() {
        const eventBus = new EventBus();
        const linkService = new PDFLinkService({ eventBus })

        // somewhere from https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.js#L239 there are no api docs
        const options = {
            container: this.$refs.pdfView,
            eventBus: eventBus,
            linkService: linkService
        };

        this.pdfViewer = new PDFViewer(options);
    }
};

</script>

<style>

.pdfViewer .page {
    margin-bottom: 20px;
    border-image: none;
}

</style>

<style scoped>

.container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #cacaca;
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

.p-toolbar {
    padding: 5px 1rem;
}

</style>
