<template>

</template>

<script>

export default {
    name: 'MainToolbar',
    emits: [ 'logout', 'upload-file', 'upload-folder', 'new-file', 'new-folder', 'download', 'delete', 'directory-up' ],
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
            this.$emit('directory-up');
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

.p-toolbar-group-right button {
    margin: 0 2px;
}

.file-actions {
    margin-right: 50px;
}

.profile-actions {
    margin-left: 50px;
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
