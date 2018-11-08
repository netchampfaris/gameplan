<template>
  <g-row class="search">
    <feather-icon slot="left" name="search" />
    <input ref="input" type="search" placeholder="Search">
  </g-row>
</template>

<script>
export default {
  name: 'SearchBox'
};
</script>

<style scoped>
.search {
  color: var(--text-grey);
}
input:not(:focus) {
  border-color: transparent;
}
</style>
