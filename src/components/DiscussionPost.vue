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
          <vue-markdown>{{ post.content }}</vue-markdown>
        </div>
        <div class="attachments" v-if="post.attachments">
          <div class="attachment" v-for="(attachment, index) in post.attachments" :key="index">
            <img :src="'http://localhost:7156/' + attachment.path" />
          </div>
        </div>
      </div>
    </div>
  </discussion-post-wrapper>
</template>
<script>
import DiscussionPostWrapper from '@/components/DiscussionPostWrapper';
import UserAvatar from '@/components/UserAvatar';
import VueMarkdown from 'vue-markdown';

export default {
  name: 'DiscussionPost',
  components: {
    UserAvatar,
    DiscussionPostWrapper,
    VueMarkdown,
  },
  props: ['post', 'is-original-post'],
  beforeMount() {

  },
};
</script>
<style scoped>
.attachments{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.attachment{
  position: relative;
  margin: 1px;
  margin-left: 0px;
  /* min-width: 120px; */
  min-height: 120px;
  border: 1px solid var(--border-color);
}
.attachment > img {
  max-height: 120px;
  /* max-width: 120px; */
}
</style>
