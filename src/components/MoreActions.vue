<template>
  <div class="container">
    <feather-icon
      class="toggle"
      name="more-horizontal"
      v-show="!isShown"
      @click.native="isShown = true"
    />
    <div class="action-items" v-show="isShown">
      <feather-icon
        v-for="item in items"
        :key="item.icon"
        :name="item.icon"
        @click.native="item.action"
      />
    </div>
  </div>
</template>
<script>
export default {
  name: 'MoreActions',
  props: ['items'],
  data() {
    return {
      isShown: false,
    }
  },
}
</script>
<style scoped>
.feather-icon {
  padding: 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
}

.feather-icon:hover {
  background-color: white;
}

.action-items {
  display: flex;
}
</style>
