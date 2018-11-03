<template>
  <div class="post-wrapper">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'DiscussionPostWrapper',
};
</script>

<style lang="scss" scoped>
.post-wrapper {
  .post {
    display: flex;
    align-items: flex-start;
    padding: 2rem;
    margin-left: -2.1rem;
    border-radius: 0.25rem;
  }

  .body {
    margin-left: 1rem;
    width: 100%;
  }

  .title {
    font-size: 1.5rem;
    line-height: 2.25rem;
  }

  .owner {
    color: var(--text-grey);
    font-weight: 300;
    line-height: 2.25rem;
    font-size: 1.2rem;
  }

  .content {
    margin-top: 1rem;
    font-weight: 300;
    font-size: 1.2rem;
    line-height: 2rem;
  }

  .action {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-grey);
    font-size: 1.2rem;
    font-weight: 300;
  }
}
</style>
