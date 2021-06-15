<template>
    <Toolbar>
        <template #left>
          <Button icon="pi pi-chevron-left" class="p-mr-2 p-button-sm" :disabled="breadCrumbs.items.length === 0" @click="onUp"/>
          <Breadcrumb :home="breadCrumbs.home" :model="breadCrumbs.items"/>
        </template>

        <template #right>
            <!-- file action buttons -->
            <Button v-show="selectedEntries.length > 1" icon="pi pi-download" class="p-ml-2 p-button-outlined p-button-sm" v-tooltip="Download" @click="onDownload"/>
            <Button v-show="selectedEntries.length > 1" icon="pi pi-trash" class="p-ml-2 p-mr-6 p-button-outlined p-button-sm p-button-danger" v-tooltip="Delete" @click="onDelete"/>

            <!-- Always visible -->
            <Button icon="pi pi-upload" class="p-ml-2 p-button-sm" label="Upload" @click="onToggleMenuUpload"/>
            <Button icon="pi pi-plus" class="p-ml-2 p-button-sm" label="New" @click="onToggleMenuNew"/>
            <Button icon="pi pi-user" class="p-ml-6 p-button-sm p-button-secondary" @click="onToggleMenuMain"/>

            <Menu ref="menuUpload" :model="uploadMenu" :popup="true"/>
            <Menu ref="menuNew" :model="newMenu" :popup="true"/>
            <Menu ref="menuMain" :model="mainMenu" :popup="true"/>
        </template>
    </Toolbar>

    <!-- About Dialog -->
    <Dialog header="About cubby" v-model:visible="aboutDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '450px'}" :modal="true">
        <div>
            Some info here!!!
            <br/><br/>
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
        currentPath: {
            type: String,
            default: ''
        },
        displayName: {
            type: String
        },
        selectedEntries: {
            type: Array,
            default: function () { return  []; }
        }
    },
    watch: {
        currentPath(newCurrentPath) {
            this.breadCrumbs.items = sanitize(newCurrentPath).split('/').slice(1).map(function (e, i, a) {
                return {
                    label: e,
                    url: '#files' + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
                };
            });
        },
        displayName(newDisplayName) {
            this.mainMenu[0].label = newDisplayName;
        }
    },
    data() {
        return {
            search: '',
            aboutDialog: {
                visible: false
            },
            breadCrumbs: {
                home: { icon: 'pi pi-home', url: '#files/' },
                items: []
            },
            mainMenu: [{
                // the position of this item is used when profile is fetched
                label: 'Display Name',
                icon: 'pi pi-user',
                disabled: true,
                class: 'menu-profile-item'
            }, {
                separator: true
            }, {
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
    },
    mounted() {
    }
};

</script>

<style scoped>

.container {
    max-width: 480px;
    margin: auto;
    padding: 20px;
}

</style>

<!-- WARNING those are not scoped, but menu DOM elements are taken out -->
<style>

.menu-profile-item > a {
    opacity: 1;
}

</style>
