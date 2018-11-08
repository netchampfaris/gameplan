<template>
  <g-row padding="2" class="back-to-discussions" @click.native="goBack">
    <feather-icon slot="left" :size="20" name="arrow-left" />
    <div class="back-text">
      Back to Discussions
    </div>
  </g-row>
</template>

<script>
export default {
  name: 'BackToDiscussions',
  methods: {
    goBack() {
      this.$router.push('/discussions');
    },
  },
};
</script>

<style scoped>
.back-to-discussions {
  color: var(--text-grey);
  font-size: 1.5rem;
  cursor: pointer;
}
/* .back-text {
  padding: 1rem 0;
} */
</style>
