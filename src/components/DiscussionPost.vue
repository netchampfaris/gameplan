<template>
  <div class="post" :class="{ 'is-editing': isEditing }">
    <g-row>
      <user-avatar slot="left" :user="post.owner"></user-avatar>

      <h1 class="title" v-if="showTitle">{{ post.title }}</h1>
      <input
        v-if="showEditTitle"
        class="title"
        ref="title"
        type="text"
        placeholder="Title"
        :value="post.title"
      />
      <span v-if="!isOriginalPost" class="owner">{{ post.owner }}</span>

      <more-actions slot="right" :items="actionItems" />
    </g-row>

    <g-row v-if="isOriginalPost">
      <span class="owner">{{ post.owner }}</span>
    </g-row>

    <g-row class="content">
      <div v-if="!isEditing" v-html="post.content"></div>
      <content-editor
        v-else
        :content="post.content"
        @submit="handleSubmit"
        @escape="isEditing = false"
      />
    </g-row>

    <g-row v-if="isEditing"> <file-drop-area /> </g-row>

    <g-row v-if="post.attachments">
      <div class="attachments">
        <attachment
          v-for="(attachment, index) of post.attachments"
          :key="index"
          :attachment="attachment"
        />
      </div>
    </g-row>
  </div>
</template>
<script>
import UserAvatar from '@/components/UserAvatar'
import MoreActions from '@/components/MoreActions'
import ContentEditor from './ContentEditor'
import Attachment from './Attachment'
import FileDropArea from './FileDropArea'

export default {
  name: 'DiscussionPost',
  components: {
    UserAvatar,
    FileDropArea,
    MoreActions,
    ContentEditor,
    Attachment,
  },
  props: ['post', 'is-original-post'],
  data() {
    return {
      isEditing: false,
      actionItems: [
        {
          icon: 'edit-2',
          action: () => {
            this.isEditing = true
            this.$nextTick(() => {
              this.$refs.title.focus()
            })
            this.$emit('edit')
          },
        },
        {
          icon: 'x',
          action: () => this.$emit('delete'),
        },
      ],
    }
  },
  computed: {
    showTitle() {
      return this.isOriginalPost && !this.isEditing
    },
    showEditTitle() {
      return this.isOriginalPost && this.isEditing
    },
  },
  methods: {
    handleSubmit(value) {
      this.$emit('update', { content: value })
      this.isEditing = false
    },
  },
}
</script>
<style scoped>
.post {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.post.is-editing {
  background-color: #fff;
  border-radius: var(--border-radius);
}

.title {
  line-height: 2.25rem;
}

h1.title {
  font-size: 1.5rem;
  font-weight: normal;
  margin: 0;
}

input.title {
  padding: 0;
  border-bottom-color: transparent;
}

.owner {
  color: var(--text-grey);
  font-size: 1.2rem;
  font-weight: lighter;
}

.content {
  margin-top: 1rem;
  font-size: 1.2rem;
  font-weight: 300;
  line-height: 2rem;
}

.content >>> p {
  font-weight: 300;
  font-size: 1.2rem;
  line-height: 2rem;
  margin: 0;
}

.attachments {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
</style>
