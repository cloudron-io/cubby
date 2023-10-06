import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import BadgeDirective from 'primevue/badgedirective';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

import '@fontsource/roboto';

import './style.css';

import Index from './Index.vue';

const app = createApp(Index);

// dummy router for breadcrumb component
const router = createRouter({
    history: createWebHistory(),
    routes: []
});

app.use(router);

app.use(PrimeVue);
app.use(ConfirmationService);
app.use(ToastService);

app.directive('tooltip', Tooltip);
app.directive('badge', BadgeDirective);

app.mount('#app');
