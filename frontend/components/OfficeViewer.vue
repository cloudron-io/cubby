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

        <div style="display: none">
            <form :action="wopiUrl" ref="wopiForm" enctype="multipart/form-data" method="post" target="document-viewer">
                <input name="access_token" :value="wopiToken" type="hidden" id="access-token"/>
                <input type="submit" value="" />
            </form>
        </div>

        <iframe ref="viewer" name="document-viewer" class="viewer"></iframe>
    </div>
</template>

<script>

import superagent from 'superagent';

export default {
    name: 'OfficeViewer',
    emits: [ 'close' ],
    data() {
        return {
            entry: null,
            wopiToken: '',
            wopiUrl: ''
        };
    },
    props: {
        entries: Array
    },
    methods: {
        canHandle(entry) {
            return entry.mimeType === 'application/vnd.oasis.opendocument.presentation' || entry.mimeType === 'application/vnd.oasis.opendocument.text';
        },
        async open(entry) {
            var that = this;

            if (!entry || entry.isDirectory || !this.canHandle(entry)) return;

            this.entry = entry;

            superagent.get('/api/v1/office/handle').query({ access_token: localStorage.accessToken }).end(function (error, result) {
                if (error) return console.error('Failed to get office handle.', error);

                var wopiSrc = window.location.origin + '/api/v1/office/wopi/files/1';
                that.wopiUrl = result.body.url + 'WOPISrc=' + wopiSrc;
                that.wopiToken = result.body.token;
                that.$refs.wopiForm.submit();
            });
        },
        onClose() {
            this.$refs.viewer.src = 'about:blank';
            this.$emit('close');
        }
    },
    mounted() {
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
    background: black;
    display: flex;
    flex-direction: column;
}

.viewer {
    height: 100%;
    border: none;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 35px;
}

</style>
