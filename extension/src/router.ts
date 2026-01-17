import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import GuestsView from './views/GuestsView.vue'
import GuestCreateView from './views/GuestCreateView.vue'
import GuestEditView from './views/GuestEditView.vue'
import GuestDeleteView from './views/GuestDeleteView.vue'
import { EXTENSION } from './constants';

const prefix: String = EXTENSION.URL_PREFIX;

const routes: RouteRecordRaw[] = [
  { path: prefix + '/', redirect: prefix + '/guests' },
  // List
  { path: prefix + '/guests', component: GuestsView },
  // Create
  { path: prefix + '/guests/new', component: GuestCreateView },
  // Edit
  { path: prefix + '/guests/:id/edit', component: GuestEditView, props: true },
  // Delete
  { path: prefix + '/guests/:id/delete', component: GuestDeleteView, props: true },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
