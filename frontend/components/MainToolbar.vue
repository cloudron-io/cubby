<template>
    <Toolbar>
        <template #left>
          <Button icon="pi pi-chevron-left" class="p-mr-2 p-button-sm" :disabled="breadCrumbs.items.length === 0" @click="onUp"/>
          <Breadcrumb :home="breadCrumbs.home" :model="breadCrumbs.items"/>
        </template>

        <template #right>
            <Button icon="pi pi-upload" class="p-ml-2 p-button-sm" label="Upload" @click="onToggleMenuUpload"/>
            <Button icon="pi pi-plus" class="p-ml-2 p-button-sm" label="New" @click="onToggleMenuNew"/>
            <Button icon="pi pi-ellipsis-h" class="p-ml-6 p-button-sm p-button-outlined" @click="onToggleMenuMain"/>

            <Menu ref="menuUpload" :model="uploadMenu" :popup="true"/>
            <Menu ref="menuNew" :model="newMenu" :popup="true"/>
            <Menu ref="menuMain" :model="mainMenu" :popup="true"/>
        </template>
    </Toolbar>

    <!-- About Dialog -->
    <Dialog header="About Cubby" v-model:visible="aboutDialog.visible" :dismissableMask="true" :closable="true" :style="{width: '450px'}" :modal="true">
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
    emits: [ 'logout', 'upload', 'upload-folder', 'new-folder' ],
    props: {
        currentPath: {
            type: String,
            default: ''
        }
    },
    watch: {
        currentPath(newCurrentPath) {
            this.breadCrumbs.items = sanitize(newCurrentPath).split('/').slice(1).map(function (e, i, a) {
                return {
                    label: e,
                    url: '#' + sanitize('/' + a.slice(0, i).join('/') + '/' + e)
                };
            });
        }
    },
    data() {
        return {
            search: '',
            aboutDialog: {
                visible: false
            },
            breadCrumbs: {
                home: { icon: 'pi pi-home', url: '#/' },
                items: []
            },
            mainMenu: [{
                label: 'Upload File',
                icon: 'pi pi-upload',
                command: () => console.log('TODO'),
                class: 'p-d-md-none'
            }, {
                label: 'Upload Folder',
                icon: 'pi pi-cloud-upload',
                command: () => console.log('TODO'),
                class: 'p-d-md-none'
            }, {
                label: 'New Folder',
                icon: 'pi pi-plus',
                command: () => console.log('TODO'),
                class: 'p-d-md-none'
            }, {
                label: 'Settings',
                icon: 'pi pi-cog',
                command: () => console.log('TODO')
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
                command: () => console.log('TODO')
            }, {
                label: 'New Folder',
                icon: 'pi pi-folder',
                command: () => console.log('TODO')
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
        onNewFolder() {
            this.$emit('new-folder');
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
