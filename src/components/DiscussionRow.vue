<template>
  <div class="discussion-row">
    <div class="subject">
      <div class="left">
        <slot name="info-left" />
      </div>
      <div class="content">
        <slot />
      </div>
    </div>
    <div class="right">
      <slot name="info-right" />
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
  justify-content: space-between;
  font-size: 1.5rem;
  color: var(--text-black);
  cursor: pointer;
  margin-left: -2.5rem;
}

.discussion-row:hover {
  background-color: #fff;
  border-radius: 0.25rem;
}

.subject {
  display: flex;
  align-items: center;
}

.left {
  width: 3.5rem;
  padding-left: 1rem;
  color: var(--text-grey);
  text-align: right;
}

.right {
  padding-right: 1rem;
}

.content {
  padding: 1rem;
}
</style>
