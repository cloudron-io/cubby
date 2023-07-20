<template>
    <div class="container">
        <Toolbar>
            <template #start>
                <Button :icon="busySave ? 'pi pi-spin pi-spinner' : 'pi pi-save'" class="p-button-sm" label="Save" @click="onSave" :disabled="busySave || !isChanged"/>
                <div class="file-name">{{ item ? item.fileName : '' }}</div>
            </template>

            <template #end>
                <Button icon="pi pi-times" class="p-button-sm" label="Close" @click="onClose"/>
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
    var language = languages.getLanguages().find(function (l) {
        if (!l.extensions) return false;
        return !!l.extensions.find(function (e) { return e === ext; });
    }) || '';
    return language ? language.id : '';
}

export default {
    name: 'TextEditor',
    emits: [ 'close', 'save' ],
    data() {
        return {
            item: {},
            isChanged: false,
            busySave: false
        };
    },
    methods: {
        canHandle(item) {
            return getFileTypeGroup(item) === 'text' || item.mimeType === 'application/json' || item.mimeType === 'application/javascript' || item.mimeType === 'application/x-shellscript';
        },
        openItem(item, content) {
            var that = this;

            if (!item || item.isDirectory || !this.canHandle(item)) return;

            this.item = item;

            superagent.get(getDirectLink(item)).end(function (error, result) {
                if (error) return console.error(error);

                that.editor.setModel(editor.createModel(result.text, getLanguage(item.fileName)));
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

            this.$emit('save', this.item, this.editor.getValue(), function () {
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

.file-name {
    margin: 0 0.5rem;
}

</style>
