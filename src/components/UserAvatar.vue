<template>
  <div class="avatar">
    <span>{{ initials }}</span>
  </div>
</template>

<script>
export default {
  name: 'UserAvatar',
  props: ['user'],
  computed: {
    initials() {
      return this.user[0].toUpperCase();
    },
  },
};
</script>

<style scoped>
.avatar {
  min-width: 2.25rem;
  min-height: 2.25rem;
  border-radius: 50%;
  background-color: #7ed321;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  color: #ffffff;
  box-shadow: 0 0 0 1px white, 0 0 0 2px #ebebeb;
}
</style>
