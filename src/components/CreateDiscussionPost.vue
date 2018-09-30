<template>
  <discussion-post-wrapper>
    <div :class="{post: true, 'is-collapsed': !isActive}">
      <user-avatar :user="post.owner"></user-avatar>
      <div class="body" @drop="onDrop"
          @dragover="dragInBox = true;" @dragleave="dragInBox = false;">
        <input class="title" v-if="isOriginalPost"
          ref="title" type="text" placeholder="Title" v-model="title">
        <div class="title" v-else>
          {{ post.title }}
        </div>
        <div class="owner">
          {{ post.owner }}
        </div>
        <content-editor
          v-model="content"
          v-if="isActive"
          @submit="postValue"
          @escape="deactivate"
        />
        <div class="attachments" v-if="attachments.length">
          <div class="attachment" v-for="(attachment, index) in attachments" :key="index">
            <img class="delete-icon" width="16px" src="@/assets/deleteIcon.svg" alt="Delete Icon" v-on:click="handleDelete(index)">
            <img class="attachment-img" v-if="attachment.base64" :style="{ 'background-image': 'url(' + attachment.base64 +')' }" />
            <div class="preview-name" v-else>
              <img src="@/assets/paperclip.svg" alt="Delete Icon">
              <div> {{ attachment.name }} </div>
            </div>
          </div>
        </div>
        <div class="action" v-if="isActive">
          <span>Cmd + Enter to post</span>
          <div class="message">Drag and Drop files to upload</div>
          <button class="feedback-btn" @click="postValue"
            :class="[ dragging ? 'drag-event' : 'post-button', { 'on-drag' : dragInBox } ]">
            <span>Drop now to upload</span>
          </button>
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
import ContentEditor from './ContentEditor';

export default {
  name: 'CreateDiscussionPost',
  components: {
    DiscussionPostWrapper,
    UserAvatar,
    ContentEditor
  },
  props: ['post', 'is-original-post', 'inactive'],
  data() {
    return {
      title: '',
      content: '',
      attachments: [],
      dragging: false,
      dragInBox: false,
      active: this.inactive === undefined || this.inactive === false,
    };
  },
  computed: {
    isActive() {
      return this.isOriginalPost || this.active;
    },
  },
  methods: {
    onDrop(event) {
      event.preventDefault();
      this.dragging = false;
      this.dragInBox = false;
      Array.from(event.dataTransfer.files).forEach(file => {
        if(!this.attachments.some( f => f.name === file.name )){ // Check if already attached
          if(file.type.match('image.*')){ //Generate preview using base64 string
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              file.base64 = reader.result
              this.attachments.push(file)
            };
            reader.onerror = (error) => {
              console.log('Error converting to base64: ', error);
            };
          } else {
            this.attachments.push(file)
          }
        }
      })
    },
    postValue() {
      if(this.title || this.content){
        this.$emit('post-value', this.title, this.content, this.attachments);
        this.content = '';
        this.title = '';
        this.attachments = [];
        this.deactivate();
      }
    },
    activate() {
      this.active = true;
    },
    deactivate() {
      this.active = false;
    },
    handleDelete(index) {
      this.attachments.splice(index, 1);
    }
  },
  mounted() {
    if (this.$refs.title) {
      this.$refs.title.focus();
    }
    document.addEventListener('dragover', (e) => {
      e.preventDefault()
      this.dragging = true;
    })
    document.addEventListener('drop', (e) => {
      this.dragging = false;
      e.preventDefault()
    })
  },
  beforeDestroy() {
    document.removeEventListener('drop', () => {});
    document.removeEventListener('dragover', () => {});
  }
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

.body{
  padding: 0px 8px;
}

.action{
  position: relative;
}

.feedback-btn{
  border-radius: 50%;
  box-shadow: 0 0 0 1px white, 0 0 0 2px #ebebeb;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  color: white;
  position: absolute;
  right: 0px;
  bottom: 3.2rem;
}

.feedback-btn:focus{
  outline: 0;
}

.feedback-btn > span{
  margin-left: 1.6rem;
  font-size: 0.9rem;
  overflow: hidden;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(.34,.6,.12,.99) 0.1s;
}

.post-button{
  background: #7ed321 url('../assets/postButton.svg') no-repeat center;
  cursor: pointer;
  transition: width 0.3s, height 0.3s, bottom 0.3s;
}
.post-button:hover {
  width: 3rem;
  height: 3rem;
  bottom: 3rem;
}

.drag-event{
  background: #7ed321 url('../assets/upload.svg') no-repeat center;
  cursor: pointer;
  transition: width 0.6s, border-radius 0.3s cubic-bezier(0.47, 0, 0.745, 0.715), background-position 0.1s;
}

.on-drag{
  background-position: 1rem;
  border-radius: 5.5rem;
  width: 13rem;
}
.on-drag > span{
  opacity: 1;
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
  max-height: 120px;
  box-shadow: 0 0 0 1px white, 0 0 0 2px #ebebeb;
}

.attachment-img{
  width: 120px;
  height: 120px;
  background-position: center center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.message{
  color: var(--text-grey);
  font-size: 1.2rem;
  font-weight: 300;
  cursor: pointer;
}

.delete-icon{
  background-color: var(--light-bg); 
  position: absolute;
  right: 0;
}
.preview-name{
  width: 100%;
  height: 40px;
  color: var(--text-grey);
  font-weight: 550;
  font-family: 'Roboto Slab', serif;
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
