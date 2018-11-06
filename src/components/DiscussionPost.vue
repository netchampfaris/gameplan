<template>
  <discussion-post-wrapper>
    <div class="post">
      <user-avatar :user="post.owner"></user-avatar>
      <div class="body">
        <div class="head" v-if="isOriginalPost">
          <span class="title">{{ post.title }}</span>
          <span class="actions" v-if="isOriginalPost">
            <more-actions :items="actionItems" />
          </span>
        </div>
        <div class="owner head">
          <span>{{ post.owner }}</span>
          <span class="actions" v-if="!isOriginalPost">
            <more-actions :items="actionItems" />
          </span>
        </div>
        <div class="content" v-html="post.content"></div>
        <div class="attachments" v-if="post.attachments">
          <div v-for="(attachment, index) of post.attachments" :key="index">
            <a :href="attachment.name" target="_blank">
              <img class="attachment-img" :href="attachment.name"
              v-if="(attachment.mimetype).toString().includes('image')"
              v-bind:key="attachment.filename" :src="attachment.name + '?size=120x120'"/>
              <div class="attachment preview-name" v-else>
                <img src="@/assets/paperclip.svg" alt="Delete Icon">
                <div> {{ attachment.filename }} </div>
              </div>
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
import MoreActions from '@/components/MoreActions';

export default {
  name: 'DiscussionPost',
  components: {
    UserAvatar,
    DiscussionPostWrapper,
    MoreActions
  },
  props: ['post', 'is-original-post'],
  data() {
    return {
      actionItems: [
        {
          icon: 'edit-2',
          action: () => this.$emit('edit')
        },
        {
          icon: 'x',
          action: () => this.$emit('delete')
        }
      ]
    }
  }
};
</script>
<style scoped>
.attachments{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.attachment{
  min-width: 120px;
  max-height: 120px;
  box-shadow: 0 0 0 1px white, 0 0 0 2px #ebebeb;
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
  width: 100%;
  height: 40px;
  color: var(--text-grey);
  font-weight: 550;
  font-family: 'Roboto Slab', serif;
  background-color: #fff;
  display: flex;
  flex-direction: row;
}
.preview-name > img{
  margin: 0.6rem;
}
.preview-name > div{
  white-space: nowrap;
  margin: 0.75rem;
  margin-right: 24px;
}
</style>
