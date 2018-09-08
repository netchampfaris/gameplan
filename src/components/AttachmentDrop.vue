<template>
  <div class="container">
    <input type="file" ref="fileInput" id="fileInput" @input="filesChange" multiple>
    <div class="dz-message">Click or Drag and Drop files here upload</div>
  </div>
</template>

<script>
import frappe from 'frappejs'
import { EventEmitter } from 'events';

export default {
  name: 'AttachmentDrop',
  data() {
    return {
      uploadedFiles: [],
      options: {
        url: '/upload',
        paramName: 'file'
      }
    };
  },
  beforeMount() {
    this.$root.$on('attachment-delete', attachments => {
      this.uploadedFiles = attachments
    })
  },
  methods: {
    // triggerInput() {
    //   this.$refs.fileInput.click()
    // },
    async filesChange(event) {
      Array.from(event.target.files).forEach( f => {
        if(!this.uploadedFiles.some( file => file.name === f.name )){
          this.uploadedFiles.push(f)
        }
      })
      this.$emit('file-attached', this.uploadedFiles);
    }
  }
};
</script>

<style scoped>
.container{
  position: relative;
}

.dz-message{
  color: var(--text-grey);
  font-size: 1.2rem;
  font-weight: 300;
  cursor: pointer;
}
input{
  cursor: pointer;
  padding: 0;
  opacity: 0;
  height: 23px;
  overflow: hidden;
  position: absolute;
}
</style>
