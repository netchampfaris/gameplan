<template>
  <discussion-post-wrapper>
    <div :class="{post: true, 'is-collapsed': !isActive}">
      <user-avatar :user="post.owner"></user-avatar>
      <div class="body">
        <input class="title" v-if="isOriginalPost"
          ref="title" type="text" placeholder="Title" v-model="title">
        <div class="title" v-else>
          {{ post.title }}
        </div>
        <div class="owner">
          {{ post.owner }}
        </div>
        <textarea
          class="content" placeholder="Content" ref="content"
          v-if="isActive" v-model="content"
          @keydown.meta.enter="postValue"
          @keydown.esc="deactivate"
        >
        </textarea>
        <div class="attachments" v-if="attachments.length">
          <div class="attachment" v-for="(attachment, index) in attachments" :key="index">
            <div v-on:click="handleDelete(index)">x</div>
            <img v-if="attachment.dataUrl" :src="attachment.dataUrl" />
            <p v-else> {{ attachment.name }} </p>
          </div>
        </div>
        <div class="action" v-if="isActive">
          <span>Cmd + Enter to post</span>
          <attachment-drop 
            v-bind:refDocType="'DiscussionBoard'" v-bind:refName="post.owner" v-bind:refFieldName="title"
            v-on:file-attached="handleAttachment"></attachment-drop>
        </div>
        <div class="action" v-if="!isActive" style="margin-top: 0.5rem;">
          <span @click="activate">Add to this discussion</span>
        </div>
      </div>
    </div>
  </discussion-post-wrapper>
</template>

<script>
import DiscussionPostWrapper from '@/components/DiscussionPostWrapper';
import UserAvatar from '@/components/UserAvatar';
import AttachmentDrop from '@/components/AttachmentDrop';

export default {
  name: 'CreateDiscussionPost',
  components: {
    DiscussionPostWrapper,
    UserAvatar,
    AttachmentDrop,
  },
  props: ['post', 'is-original-post', 'inactive'],
  data() {
    return {
      title: '',
      content: '',
      attachments: [],
      active: this.inactive === undefined || this.inactive === false,
    };
  },
  computed: {
    isActive() {
      return this.isOriginalPost || this.active;
    },
  },
  methods: {
    postValue() {
      this.$emit('post-value', this.title, this.content);
      this.content = '';
      this.title = '';
      this.attachments = [];
      this.deactivate();
    },
    activate() {
      this.active = true;
      this.$nextTick().then(() => this.$refs.content.focus());
    },
    deactivate() {
      this.active = false;
    },
    handleAttachment(attachedFiles) {
      this.attachments = attachedFiles;
    },
    handleDelete(index) {
      this.attachments.splice(index, 1);
    },
  },
  mounted() {
    if (this.$refs.title) {
      this.$refs.title.focus();
    }
  },
};
</script>

<style scoped>
.post:not(.is-collapsed) {
  background-color: #ffffff;
}

input.title {
  padding: 0;
  border-bottom-color: transparent;
}

textarea.content {
  border: none;
  outline: none;
  padding: 0;
  background-color: transparent;
  width: 100%;
  min-height: 5rem;
  overflow: visible;
  resize: none;
  caret-color: var(--text-blue);
}

textarea.content::placeholder {
  color: var(--text-grey);
}
.attachments{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.attachment{
  position: relative;
  margin: 1px;
  margin-left: 0px;
  min-width: 120px;
  min-height: 120px;
  border: 1px solid var(--border-color);
}
.attachment div{
  background-color: var(--light-bg);
  position: absolute;
  padding: 0px 2px;
  right: 0;
}
.attachment p{
  color: var(--text-black);
  text-align: center;
}
</style>
