<template>
  <div class="grid">
    <div class="left" :class="paddingStyle">
      <slot name="left"></slot>
    </div>
    <div class="body" :class="paddingStyle">
      <slot></slot>
    </div>
    <div class="right" :class="paddingStyle">
      <slot name="right"></slot>
    </div>
  </div>
</template>
<script>
export default {
  name: 'Row',
  props: {
    padding: {
      default: 0
    }
  },
  computed: {
    paddingStyle() {
      return `p-${this.padding}`;
    }
  }
}
</script>

<style>
.grid {
  display: grid;
  grid-template-columns: 3.5rem auto min-content;
  grid-gap: 1rem;
}

.left, .body, .right {
  display: flex;
  align-items: center;
}

.left {
  justify-content: flex-end;
  padding-left: 1rem;
}

.right {
  padding-right: 1rem;
}

.p-1 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.p-2 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
