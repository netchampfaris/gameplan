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
          @blur="deactivate" @keydown.esc="deactivate"
        >
        </textarea>
        <div class="action" v-if="isActive">
          <span>Cmd + Enter to post</span>
          <span>Drop files here to attach</span>
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

export default {
  name: 'CreateDiscussionPost',
  components: {
    DiscussionPostWrapper,
    UserAvatar,
  },
  props: ['post', 'is-original-post', 'inactive'],
  data() {
    return {
      title: '',
      content: '',
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
      this.deactivate();
    },
    activate() {
      this.active = true;
      this.$nextTick().then(() => this.$refs.content.focus());
    },
    deactivate() {
      this.active = false;
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
  min-height: 10rem;
  resize: none;
  caret-color: var(--text-blue);
}

textarea.content::placeholder {
  color: var(--text-grey);
}
</style>
