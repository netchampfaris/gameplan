<template>
  <div class="back-to-discussions" @click="goBack">
      <img src="@/assets/backIcon.svg" alt="Back Icon">
      <div class="back-text">
        Back to Discussions
      </div>
  </div>
</template>

<script>
export default {
  name: 'BackToDiscussions',
  methods: {
    goBack() {
      this.$router.go(-1);
    },
  },
};
</script>

<style scoped>
.back-to-discussions {
  display: flex;
  color: var(--text-grey);
  font-size: 1.5rem;
  height: 2rem;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
}
.back-text {
  margin-left: 1rem;
}
</style>
