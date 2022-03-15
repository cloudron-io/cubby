<template>
    <div class="container">
        <Toolbar>
            <template #left>
                <Button :icon="busySave ? 'pi pi-spin pi-spinner' : 'pi pi-save'" class="p-mr-2 p-button-sm" label="Save" @click="onSave" :disabled="busySave || !isChanged"/>
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
import { getFileTypeGroup, getDirectLink } from '../utils.js';

function getLanguage(filename) {
    var ext = '.' + filename.split('.').pop();
    var language = languages.getLanguages().find(function (l) { return !!l.extensions.find(function (e) { return e === ext; }); }) || '';
    return language ? language.id : '';
}

export default {
    name: 'TextEditor',
    emits: [ 'close', 'saved' ],
    data() {
        return {
            entry: {},
            isChanged: false,
            busySave: false
        };
    },
    methods: {
        canHandle(entry) {
            return getFileTypeGroup(entry) === 'text' || entry.mimeType === 'application/json' || entry.mimeType === 'application/javascript' || entry.mimeType === 'application/x-shellscript';
        },
        open(entry) {
            var that = this;

            if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

            this.entry = entry;

            superagent.get(getDirectLink(entry)).end(function (error, result) {
                if (error) return console.error(error);

                that.editor.setModel(editor.createModel(result.text, getLanguage(entry.fileName)));
                that.editor.getModel().onDidChangeContent(function () { that.isChanged = true; });
            });
        },
        onClose() {
            this.editor.setModel(editor.createModel(''));

            this.$emit('close');
        },
        onSave() {
            var that = this;

            this.isChanged = false;
            this.busySave = true;

            this.$emit('saved', this.entry, this.editor.getValue(), function () {
                that.busySave = false;
            });
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
