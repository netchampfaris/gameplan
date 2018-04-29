<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Roboto+Slab');
@import 'normalize.css/normalize.css';

:root {
  --light-bg: #f7f7f7;
  --text-grey: #a6acb2;
  --text-black: #2a2e33;
  --text-blue: #4d92df;
  --border-color: #cccccc;
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
