<template>
    <Toolbar>
        <template #left>
          <Button icon="pi pi-chevron-left" class="p-mr-2 p-button-sm" :disabled="breadCrumbs.length === 0" @click="onUp"/>
          <Breadcrumb :home="breadCrumbHome" :model="breadCrumbs"/>
        </template>

        <template #right>
            <!-- file action buttons -->
            <Button v-show="selectedEntries.length > 1" icon="pi pi-download" class="p-ml-2 p-button-outlined p-button-sm" v-tooltip="'Download'" @click="onDownload"/>
            <Button v-show="displayName && selectedEntries.length > 1" icon="pi pi-trash" class="p-ml-2 p-mr-6 p-button-outlined p-button-sm p-button-danger" v-tooltip="'Delete'" @click="onDelete"/>

            <!-- Always visible if we have a login session-->
            <Button v-show="displayName" icon="pi pi-upload" class="p-ml-2 p-button-sm" label="Upload" @click="onToggleMenuUpload"/>
            <Button v-show="displayName" icon="pi pi-plus" class="p-ml-2 p-button-sm" label="New" @click="onToggleMenuNew"/>
            <Button v-show="displayName" icon="pi pi-user" class="p-ml-6 p-button-sm p-button-secondary" @click="onToggleMenuMain" :label="displayName"/>

            <Menu ref="menuUpload" :model="uploadMenu" :popup="true"/>
            <Menu ref="menuNew" :model="newMenu" :popup="true"/>
            <Menu ref="menuMain" :model="mainMenu" :popup="true"/>
        </template>
    </Toolbar>

    <!-- About Dialog -->
    <Dialog header="About Cubby" v-model:visible="aboutDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '450px'}" :modal="true">
        <div>
            Cubby the painless file sharing solution!<br/>
            Developed by <a href="https://cloudron.io" target="_blank">Cloudron</a>.
            <br/>
        </div>
        <template #footer>
            <Button label="Close" icon="pi pi-times" class="p-button-text" @click="aboutDialog.visible = false"/>
        </template>
    </Dialog>
</template>

<script>

import { sanitize } from '../utils.js';

export default {
    name: 'MainToolbar',
    emits: [ 'logout', 'upload-file', 'upload-folder', 'new-file', 'new-folder', 'download', 'delete' ],
    props: {
        breadCrumbs: {
            type: Array,
            default: () => []
        },
        breadCrumbHome: {
            type: Object,
            default: () => { return { icon: 'pi pi-home' }; }
        },
        displayName: {
            type: String,
            default: ''
        },
        selectedEntries: {
            type: Array,
            default: () =>[]
        }
    },
    data() {
        return {
            search: '',
            aboutDialog: {
                visible: false
            },
            breadCrumbModel: {
                home: { icon: 'pi pi-home' },
                items: []
            },
            mainMenu: [{
                label: 'About',
                icon: 'pi pi-info-circle',
                command: () => this.aboutDialog.visible = true
            }, {
                label: 'Logout',
                icon: 'pi pi-sign-out',
                command: this.onLogout
            }],
            newMenu: [{
                label: 'New File',
                icon: 'pi pi-file',
                command: () => this.onNewFile()
            }, {
                label: 'New Folder',
                icon: 'pi pi-folder',
                command: () => this.onNewFolder()
            }],
            uploadMenu: [{
                label: 'Upload File',
                icon: 'pi pi-file',
                command: () => this.onUploadFile()
            }, {
                label: 'Upload Folder',
                icon: 'pi pi-folder',
                command: () => this.onUploadFolder()
            }]
        };
    },
    methods: {
        onToggleMenuUpload(event) {
            this.$refs.menuUpload.toggle(event);
        },
        onToggleMenuNew(event) {
            this.$refs.menuNew.toggle(event);
        },
        onToggleMenuMain(event) {
            this.$refs.menuMain.toggle(event);
        },
        onLogout() {
            this.$emit('logout');
        },
        onUp() {
            window.location.hash = sanitize(this.currentPath.split('/').slice(0, -1).filter(function (p) { return !!p; }).join('/'));
        },
        onUploadFile() {
            this.$emit('upload-file');
        },
        onUploadFolder() {
            this.$emit('upload-folder');
        },
        onNewFile() {
            this.$emit('new-file');
        },
        onNewFolder() {
            this.$emit('new-folder');
        },
        onDownload() {
            this.$emit('download');
        },
        onCopy() {
            this.$emit('copy');
        },
        onDelete() {
            this.$emit('delete');
        }
    }
};

</script>

<style scoped>

.container {
    max-width: 480px;
    margin: auto;
    padding: 20px;
}

.p-toolbar {
    padding: 0.5rem;
}

.p-breadcrumb {
    background: none;
}

</style>

<!-- WARNING those are not scoped, but menu DOM elements are taken out -->
<style>

.menu-profile-item > a {
    opacity: 1;
}

</style>
