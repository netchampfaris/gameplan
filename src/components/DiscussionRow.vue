<template>
  <div class="discussion-row">
    <div class="indicator">
      <div class="indicator-blue"></div>
    </div>
    <div class="discussion-row-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiscussionRow',
};
</script>

<style scoped>
.discussion-row {
  display: flex;
  align-items: center;
  padding: 1rem;
  font-size: 1.5rem;
  color: var(--text-black);
  cursor: pointer;
}

.discussion-row:hover {
  background-color: #fff;
  border-radius: 0.25rem;
}

.indicator {
  width: 1rem;
  height: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.indicator-blue {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-blue);
}

.discussion-row-content {
  margin-left: 1rem;
}
</style>
