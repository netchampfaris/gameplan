<template>
  <div>
    <a :href="attachment.name" target="_blank">
      <img
        class="attachment-img"
        v-if="isImage"
        :src="attachment.name + '?size=120x120'"
      />
      <div class="attachment preview-name" v-else>
        <feather-icon name="paperclip" />
        <div> {{ attachment.filename }} </div>
      </div>
    </a>
  </div>
</template>
<script>
export default {
  name: 'Attachment',
  props: ['attachment'],
  computed: {
    isImage() {
      return this.attachment.mimetype.toString().includes('image');
    }
  }
}
</script>
<style scoped>
.attachment {
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
