<template>
  <discussion-post-wrapper>
    <div class="post">
      <user-avatar :user="post.owner"></user-avatar>
      <div class="body">
        <div class="title" v-if="isOriginalPost">
          {{ post.title }}
        </div>
        <div class="owner">
          {{ post.owner }}
        </div>
        <div class="content">
          {{ post.content }}
        </div>
      </div>
    </div>
  </discussion-post-wrapper>
</template>
<script>
import DiscussionPostWrapper from '@/components/DiscussionPostWrapper';
import UserAvatar from '@/components/UserAvatar';

export default {
  name: 'DiscussionPost',
  components: {
    UserAvatar,
    DiscussionPostWrapper,
  },
  props: ['post', 'is-original-post'],
};
</script>
<style scoped>

</style>
