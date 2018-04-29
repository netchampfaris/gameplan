<template>
  <div class="start-discussion">
    <back-to-discussions></back-to-discussions>
    <div class="new-discussion">
      <div class="avatar"></div>
      <div class="content">
        <input type="text" placeholder="Title">
      </div>
    </div>
  </div>
</template>

<script>
import BackToDiscussions from '@/components/BackToDiscussions';

export default {
  name: 'StartDiscussion',
  components: {
    BackToDiscussions,
  },
};
</script>

<style scoped>
.start-discussion {
  max-width: 60%;
  margin: 0 auto;
  padding-top: 2rem;
}

.new-discussion {
  padding: 1rem;
  background-color: #fff;
  border-radius: 0.25rem;
  display: flex;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #7ED321;
}

.content {
  margin-left: 1rem;
}
</style>
