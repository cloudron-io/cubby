<template>
  <Toolbar>
    <template #start>
      <Button icon="pi pi-chevron-left" class="p-button-text" :disabled="breadCrumbs.length === 0" @click="onUp"/>

      <Breadcrumb :home="breadCrumbHome" :model="breadCrumbs">
        <template #item="{ label, item, props }">
          <a :href="item.route" :target="item.target" v-bind="props.action">
            <span v-if="item.icon" v-bind="props.icon" />
            <span v-bind="props.label">{{ label }}</span>
          </a>
        </template>
      </Breadcrumb>
    </template>

    <template #end>
      <div class="file-actions">
        <Button v-show="selectedEntries.length" icon="pi pi-download" class="p-button-outlined" @click="onDownload"/>
        <Button v-show="displayName && selectedEntries.length" icon="pi pi-trash" class="p-button-outlined p-button-danger" @click="onDelete"/>
      </div>

      <Button icon="pi pi-upload" label="Upload" @click="onToggleMenuUpload" :disabled="readonly"/>
      <Button icon="pi pi-plus" label="New" @click="onToggleMenuNew" :disabled="readonly"/>

      <div class="profile-actions">
        <Button v-show="displayName" icon="pi pi-user" class="p-button-secondary" @click="onToggleMenuMain" :label="displayName"/>
        <Button v-show="!displayName" icon="pi pi-sign-in" class="p-button-secondary" @click="onLogin" label="Login"/>

        <Menu ref="menuUpload" :model="uploadMenu" :popup="true"/>
        <Menu ref="menuNew" :model="newMenu" :popup="true"/>
        <Menu ref="menuMain" :model="mainMenu" :popup="true"/>
      </div>
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

import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';
import Toolbar from 'primevue/toolbar';

export default {
    name: 'MainToolbar',
    components: {
      Breadcrumb,
      Button,
      Dialog,
      Menu,
      Toolbar
    },
    emits: [ 'login', 'logout', 'upload-file', 'upload-folder', 'new-file', 'new-folder', 'download', 'delete', 'directory-up' ],
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
      },
      readonly: {
        type: Boolean,
        default: true
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
      onLogin() {
        this.$emit('login');
      },
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

</style>
