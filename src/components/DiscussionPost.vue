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
          <div v-for="(attachment, index) of post.attachments" :key="index">
            <a :href="attachment.name" target="_blank">
              <img class="attachment-img" :href="attachment.name"
              v-if="(attachment.mimetype).toString().includes('image')"
              v-bind:key="attachment.filename" :src="attachment.name + '?size=120x120'"/>
              <p class="attachment preview-name" v-else> {{ attachment.filename }} </p>
            </a>
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
  props: ['post', 'is-original-post']
};
</script>
<style scoped>
.attachments{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.attachment-img{
  position: relative;
  margin: 1px;
  margin-left: 0px;
  min-width: 120px;
  max-height: 120px;
  border: 1px solid var(--border-color);
  width: 120px;
  display: block;
}
.preview-name{
  color: var(--text-black);
  font-family: 'Roboto Slab', serif;
  text-align: center;
  text-overflow: clip;
}
</style>
