import { createApp } from 'vue';

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
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
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import './style.css';

import Index from './Index.vue';
import EntryList from './components/EntryList.vue';
import SideBar from './components/SideBar.vue';
import Login from './components/Login.vue';
import MainToolbar from './components/MainToolbar.vue';
import ImageViewer from './components/ImageViewer.vue';

const app = createApp(Index);

app.use(PrimeVue);
app.use(ConfirmationService);
app.use(ToastService);

app.component('Dialog', Dialog);
app.component('Button', Button);
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

app.directive('tooltip', Tooltip);

// custom components
app.component('Login', Login);
app.component('MainToolbar', MainToolbar);
app.component('EntryList', EntryList);
app.component('SideBar', SideBar);
app.component('ImageViewer', ImageViewer);

app.mount('#app');