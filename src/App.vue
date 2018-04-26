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

:root {
  --light-bg: #f7f7f7;
  --text-grey: #a6acb2;
  --text-black: #2a2e33;
  --text-blue: #4d92df;
  --border-color: #cccccc;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
}

#app {
  font-family: 'Roboto Slab', serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 16px;
  text-align: center;
  background-color: var(--light-bg);
}
</style>
