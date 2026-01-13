import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import GuestsView from './views/GuestsView.vue';
import { EXTENSION } from './constants';

const prefix: String = EXTENSION.URL_PREFIX;

const routes: RouteRecordRaw[] = [
  { path: prefix + '/', redirect: prefix + '/guests' }, // Default redirect
  { path: prefix + '/guests', component: GuestsView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
