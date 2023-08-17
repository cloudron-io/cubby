import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Breadcrumb from 'primevue/breadcrumb';
import Menu from 'primevue/menu';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import Toolbar from 'primevue/toolbar';
import Checkbox from 'primevue/checkbox';
import Tooltip from 'primevue/tooltip';
import RadioButton from 'primevue/radiobutton';
import ConfirmationService from 'primevue/confirmationservice';
import ConfirmDialog from 'primevue/confirmdialog';
import ContextMenu from 'primevue/contextmenu';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Calendar from 'primevue/calendar';
import BadgeDirective from 'primevue/badgedirective';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

import '@fontsource/roboto';

import './style.css';

import Index from './Index.vue';
import EntryList from './components/EntryList.vue';
import EntryListItem from './components/EntryListItem.vue';
import SideBar from './components/SideBar.vue';
import Login from './components/Login.vue';
// import PdfViewer from './components/PdfViewer.vue';
// import OfficeViewer from './components/OfficeViewer.vue';
import GenericViewer from './components/GenericViewer.vue';

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

app.component('Dialog', Dialog);
app.component('Dropdown', Dropdown);
app.component('Button', Button);
app.component('Calendar', Calendar);
app.component('RadioButton', RadioButton);
app.component('InputText', InputText);
app.component('Password', Password);
app.component('Breadcrumb', Breadcrumb);
app.component('Menu', Menu);
app.component('ProgressBar', ProgressBar);
app.component('Message', Message);
app.component('Checkbox', Checkbox);
app.component('Toolbar', Toolbar);
app.component('ConfirmDialog', ConfirmDialog);
app.component('Toast', Toast);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('ContextMenu', ContextMenu);

app.directive('tooltip', Tooltip);
app.directive('badge', BadgeDirective);

// custom components
app.component('Login', Login);
app.component('EntryList', EntryList);
app.component('EntryListItem', EntryListItem);
app.component('SideBar', SideBar);
// app.component('PdfViewer', PdfViewer);
// app.component('OfficeViewer', OfficeViewer);
app.component('GenericViewer', GenericViewer);

app.mount('#app');