// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import VueResource from 'vue-resource';
import App from './App';
import router from './router';

import frappe from 'frappejs';
import io from 'socket.io-client';
import Observable from 'frappejs/utils/observable';
import HTTPClient from 'frappejs/backends/http';
import common from 'frappejs/common';
import coreModels from 'frappejs/models';
import models from './models';

import Row from './components/Row';
import FeatherIcon from 'frappejs/ui/components/FeatherIcon';

const server = 'localhost:8000';
window.frappe = frappe;
frappe.init();
frappe.registerLibs(common);
frappe.registerModels(coreModels);
frappe.registerModels(models);

frappe.fetch = window.fetch.bind();
frappe.db = new HTTPClient({ server });
const socket = io.connect(`http://${server}`);
frappe.db.bindSocketClient(socket);
frappe.docs = new Observable();

const session = localStorage.getItem('session');
if (session) {
  frappe.session = JSON.parse(session);
}

Vue.use(VueResource);
Vue.component('g-row', Row);
Vue.component('feather-icon', FeatherIcon);
Vue.config.productionTip = false;

/* eslint-disable no-new */
new Vue({
  el: '#gameplan',
  router,
  components: { App },
  template: '<App/>',
});
