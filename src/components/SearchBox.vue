<template>
  <div class="search-box">
      <img src="@/assets/searchIcon.svg" alt="Search Icon">
      <div class="search-action">
        <input ref="input" type="search" placeholder="Search">
      </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBox',
  data() {
    return {
      inputVisible: false,
    };
  },
};
</script>

<style scoped>
.search-box {
  display: flex;
  color: var(--text-grey);
  font-size: 1.5rem;
  height: 2rem;
  align-items: center;
  padding: 1rem;
}

.search-placeholder {
  cursor: text;
}

.search-action {
  margin-left: 1rem;
  width: 100%;
}

input:not(:focus) {
  border-color: transparent;
}
</style>
