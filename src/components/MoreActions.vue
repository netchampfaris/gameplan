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
import FeatherIcon from 'frappejs/ui/components/FeatherIcon';
export default {
  name: 'MoreActions',
  props: ['items'],
  data() {
    return {
      isShown: false
    }
  },
  components: {
    FeatherIcon,
  }
};
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
</style>
