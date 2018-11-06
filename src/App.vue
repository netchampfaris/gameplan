<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
import frappe from 'frappejs';
import nprogress from 'nprogress';

nprogress.configure({ showSpinner: false });

export default {
  name: 'App',
  mounted() {
    this.$nprogress = nprogress;
    frappe.events.on('http:ajaxStart', () => {
      if (nprogress.isStarted()) {
        nprogress.inc();
      } else {
        nprogress.start();
      }
    });

    frappe.events.on('http:ajaxStop', () => {
      nprogress.done();
    });
  }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Roboto+Slab:300,400,700');
@import "~nprogress/nprogress.css";

:root {
  --light-bg: #f7f7f7;
  --text-grey: #a6acb2;
  --text-black: #2a2e33;
  --text-blue: #4d92df;
  --border-color: #cccccc;
  --danger: #e94e61;
  --font-stack: 'Roboto Slab', serif;
  --border-radius: 0.25rem;
}

html {
  font-size: 14px;
}

body{
  margin: 0;
}


#app {
  font-family: var(--font-stack);
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

/* nprogress */

body #nprogress .bar {
  background: var(--text-blue);
}

body #nprogress .peg {
  box-shadow: 0 0 10px var(--text-blue), 0 0 5px var(--text-blue);
}
</style>
