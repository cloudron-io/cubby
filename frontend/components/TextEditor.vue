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
        <div ref="editorView" class="editor"></div>
    </div>
</template>

<script>

import { editor, languages } from 'monaco-editor';
import superagent from 'superagent';
import { encode } from '../utils.js';

function getLanguage(filename) {
    var ext = '.' + filename.split('.').pop();
    var language = languages.getLanguages().find(function (l) { return !!l.extensions.find(function (e) { return e === ext; }); }) || '';
    return language ? language.id : '';
}

export default {
    name: 'TextEditor',
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
        entry(newEntry) {
            var that = this;

            if (!newEntry || newEntry.isDirectory) return;

            superagent.get('/api/v1/files').query({ type: 'raw', path: encode(newEntry.filePath), access_token: localStorage.accessToken }).end(function (error, result) {
                if (error) return console.error(error);

                that.editor.setModel(editor.createModel(result.text, getLanguage(newEntry.fileName)));
            });
        }
    },
    methods: {
        onClose() {
            this.editor.setModel(editor.createModel(''));

            this.$emit('close');
        }
    },
    mounted() {
        this.editor = editor.create(this.$refs.editorView, {
            automaticLayout: true,
            value: '',
            theme: 'vs-light'
        });
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
    display: flex;
    flex-direction: column;
}

.editor {
    width: 100%;
    height: 100%;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 35px;
}

</style>
