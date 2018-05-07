<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
import frappe from 'frappejs';
import io from 'socket.io-client';
import Observable from 'frappejs/utils/observable';
import HTTPClient from 'frappejs/backends/http';
import common from 'frappejs/common';
import coreModels from 'frappejs/models';
import models from './models';

const server = 'localhost:7156';
window.frappe = frappe;
frappe.init();
frappe.registerLibs(common);
frappe.registerModels(coreModels);
frappe.registerModels(models);

frappe.fetch = window.fetch.bind();
frappe.db = new HTTPClient({ server });
this.socket = io.connect(`http://${server}`);
frappe.db.bindSocketClient(this.socket);
frappe.docs = new Observable();

const session = localStorage.getItem('session');
if (session) {
  frappe.session = JSON.parse(session);
}

export default {
  name: 'App',
};
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Roboto+Slab:300,400,700');
@import 'normalize.css/normalize.css';

:root {
  --light-bg: #f7f7f7;
  --text-grey: #a6acb2;
  --text-black: #2a2e33;
  --text-blue: #4d92df;
  --border-color: #cccccc;
  --danger: #e94e61;
}

html {
  font-size: 14px;
}

#app {
  font-family: 'Roboto Slab', serif;
  background-color: var(--light-bg);
  min-height: 100vh;
}

input {
  background-color: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-black);
  width: 100%;
  font-size: 1.5rem;
}

input::placeholder {
  color: var(--text-grey);
}
</style>
