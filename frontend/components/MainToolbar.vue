<template>
    <Toolbar>
        <template #left>
            <span class="p-input-icon-left">
                <i class="pi pi-search" />
                <InputText type="text" v-model="search" placeholder="Search" />
            </span>
        </template>

        <template #right>
            <span class="p-buttonset p-d-none p-d-md-flex">
                <Button class="p-button-sm" label="Upload File" icon="pi pi-upload" @click="onUpload"/>
                <Button class="p-button-sm" label="Upload Folder" icon="pi pi-cloud-upload" @click="onUploadFolder"/>
                <Button class="p-button-sm" label="New Folder" icon="pi pi-plus" @click="onNewFolder"/>
            </span>
            <Button icon="pi pi-ellipsis-h" class="p-ml-2 p-button-sm p-button-outlined" @click="toggleMenu"/>
            <Menu ref="menu" :model="mainMenu" :popup="true"/>
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

export default {
    name: 'MainToolbar',
    emits: [ 'logout' ],
    data() {
        return {
            search: '',
            aboutDialog: {
                visible: false
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
            }]
        };
    },
    methods: {
        onLogout() {
            this.$emit('logout');
        },
        toggleMenu(event) {
            this.$refs.menu.toggle(event);
        },
        onUpload() {
            this.$emit('upload');
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
