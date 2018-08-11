<template>
  <vue-clip :options="options" :on-complete="complete">
    <div slot="clip-uploader-action">
        <div class="dz-message"><span> Drop files here upload </span></div>
    </div>
    <!-- <div slot="clip-uploader-body" slot-scope="props">
      <div v-for="(file, index) in props.files" :key="index" ></div>
    </div> -->
  </vue-clip>
</template>

<script>

export default {
  name: 'AttachmentDrop',
  data() {
    return {
      options: {
        url: process.env.PRODUCTION ? '/api/upload' : 'http://localhost:7156/api/upload',
        paramName: 'attachments',
      },
      attachments: [],
      attachmentsPath: [],
    };
  },
  methods: {
    complete(file, status, xhr) {
      if (status === 'success') {
        this.attachments.push(file);
        this.attachmentsPath.push(xhr.responseText);
        this.$emit('file-attached', this.attachments, this.attachmentsPath);
      } else {
        throw (status);
      }
    },
  },
};
</script>

<style scoped>

</style>
