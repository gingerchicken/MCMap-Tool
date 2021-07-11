import Vue from 'vue';
import VueRouter from 'vue-router';

import Upload from '../components/pages/Upload.vue';

Vue.use(VueRouter);

const routes = [
    {
        name: "Upload",
        path: "/",
        component: Upload
    }
];

export const router = new VueRouter({
    mode: "history",
    routes,
    base: '/'
});