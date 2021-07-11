import '../css/main.css';
import Vue from 'vue';

import {router} from './router';

import App from '../components/App.vue';

(async () => {
    Vue.config.devtools = true; // TODO remove later.

    new Vue({
        router,
        render: createElement => createElement(App)
    }).$mount('#app');
})();