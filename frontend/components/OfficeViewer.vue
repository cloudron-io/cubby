<template>
  <MainLayout :gap="false">
    <template #header>
      <TopBar class="navbar" :gap="false">
        <template #left>
          where
        </template>
        <template #center>
          <div class="file-name">{{ entry ? entry.fileName : '' }}</div>
        </template>
        <template #right>
          <Button icon="pi pi-download" severity="success" @click="onDownload" style="margin-right: 5px;"/>
          <Button icon="pi pi-times" :label="tr('main.dialog.close')" @click="onClose"/>
        </template>
      </TopBar>
    </template>
    <template #body>
      <div style="display: none">
        <form :action="wopiUrl" ref="wopiForm" enctype="multipart/form-data" method="post" target="document-viewer">
          <input name="access_token" :value="wopiToken" type="hidden" id="access-token"/>
          <input type="submit" value="" />
        </form>
      </div>

      <iframe ref="officeViewer" name="document-viewer" class="viewer"></iframe>
    </template>
  </MainLayout>
</template>

<script>

import Button from 'primevue/button';

import { MainLayout, TopBar } from 'pankow';

export default {
  name: 'OfficeViewer',
  components: {
    Button,
    MainLayout,
    TopBar
  },
  emits: [ 'close' ],
  data() {
    return {
      entry: null,
      wopiToken: '',
      wopiUrl: ''
    };
  },
  props: {
    config: {},
    tr: {
      type: Function,
      default(id) { console.warn('Missing tr for OfficeViewer'); return id; }
    }
  },
  methods: {
    canHandle(entry) {
      if (!this.config) return false;
      if (!this.config.viewers) return false;
      if (!this.config.viewers.collabora) return false;
      if (!this.config.viewers.collabora.extensions) return false;

      return this.config.viewers.collabora.extensions.find(function (e) { return entry.fileName.endsWith(e); });
    },
    async open(entry) {
      if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

      this.entry = entry;

      const handle = await this.$root.mainModel.getOfficeHandle(entry.filePath);

      const wopiSrc = this.$root.API_ORIGIN + '/api/v1/office/wopi/files/' + handle.shareId;
      this.wopiUrl = handle.url + 'WOPISrc=' + wopiSrc;
      this.wopiToken = handle.token;

      setTimeout(() => {
        this.$refs.wopiForm.submit();
      }, 500);
    },
    onClose() {
      this.$refs.officeViewer.src = 'about:blank';
      this.$emit('close');
    }
  },
  mounted() {
  }
};

</script>

<style scoped>

.viewer {
  height: 100%;
  width: 100%;
  border: none;
}

</style>
