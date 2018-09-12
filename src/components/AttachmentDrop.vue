<template>
  <div class="container">
    <input type="file" ref="fileInput" class="file-input" @input="filesChange" multiple>
    <div class="message">Click or Drag and Drop files here upload</div>
  </div>
</template>

<script>
export default {
  name: 'AttachmentDrop',
  data() {
    return {
      uploadedFiles: []
    };
  },
  beforeMount() {
    this.$root.$on('attachment-delete', attachments => {
      this.uploadedFiles = attachments
    })
  },
  methods: {
    async filesChange(event) {
      Array.from(event.target.files).forEach(file => {
        if(!this.uploadedFiles.some( f => f.name === file.name )){ // Check if already attached
          if(file.type.match('image.*')){ //Generate preview using base64 string
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              file.base64 = reader.result
              this.uploadedFiles.push(file)
            };
            reader.onerror = (error) => {
              console.log('Error converting to base64: ', error);
            };
          } else {
            this.uploadedFiles.push(file)
          }
        }
      })
      this.$refs.fileInput.value = ''
      this.$emit('file-attached', this.uploadedFiles);
    }
  }
};
</script>

<style scoped>
.container{
  position: relative;
}

.message{
  color: var(--text-grey);
  font-size: 1.2rem;
  font-weight: 300;
  cursor: pointer;
}
.file-input{
  cursor: pointer;
  padding: 0;
  opacity: 0;
  height: 23px;
  overflow: hidden;
  position: absolute;
}
</style>
