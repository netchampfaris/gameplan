<template>
  <div class="container">
    <form enctype="multipart/form-data" novalidate v-if="isInitial || isSaving">
      <div class="dropbox">
        <input type="file" multiple :name="uploadFieldName" :disabled="isSaving" @change="filesChange($event.target.name, $event.target.files); fileCount = $event.target.files.length"
          class="input-file">
          <p v-if="isInitial">
            Drag your file(s) here to begin
          </p>
          <p v-if="isSaving">
            Uploading {{ fileCount }} files...
          </p>
          <p v-if="isSuccess">
            Uploaded {{ uploadedFiles.length }} file(s) successfully. <a href="javascript:void(0)" @click="reset()">Upload again</a>
          </p>
          <p v-if="isFailed">
            Uploaded failed. <a href="javascript:void(0)" @click="reset()">Try again</a>
          </p>
      </div>
    </form>
  </div>
</template>

<script>
import frappe from 'frappejs';

const STATUS_INITIAL = 0, STATUS_SAVING = 1, STATUS_SUCCESS = 2, STATUS_FAILED = 3;

export default {
  name: 'AttachmentDrop',
  props: ['refName', 'refDocType', 'refFieldName'],
  data() {
    return {
      uploadedFiles: [],
      uploadError: null,
      currentStatus: null,
      uploadFieldName: 'photos'
    };
  },
  computed: {
      isInitial() {
        return this.currentStatus === STATUS_INITIAL;
      },
      isSaving() {
        return this.currentStatus === STATUS_SAVING;
      },
      isSuccess() {
        return this.currentStatus === STATUS_SUCCESS;
      },
      isFailed() {
        return this.currentStatus === STATUS_FAILED;
      }
    },
  methods: {
    reset() {
      // reset form to initial state
      this.currentStatus = STATUS_INITIAL;
      this.uploadedFiles = [];
      this.uploadError = null;
    },
    async save() {
      this.currentStatus = STATUS_SAVING;
      try {
        await frappe.db.uploadFiles(this.uploadedFiles, this.refDocType, this.refName.split('@')[0], this.refFieldName)
        this.currentStatus = STATUS_SUCCESS;
      } catch (error) {
        this.currentStatus = STATUS_FAILED;
        console.log(error)
        throw error
      }
      // this.$emit('file-attached', this.uploadedFiles);
    },
    filesChange(fieldName, fileList) {
      // handle file changes
      if (!fileList.length) return;
      Array.from(Array(fileList.length).keys())
        .map(x => {
          this.uploadedFiles.push(fileList[x]);
          console.log(this.uploadedFiles[x])
        });
      this.save();
    }
  },
  mounted() {
    this.reset();
  }
};
</script>

<style scoped>
.dropbox {
  opacity: 0.8;
  color: dimgray;
  position: relative;
  cursor: pointer;
}
.input-file {
  opacity: 0; /* invisible but it's there! */
  width: 100%;
  height: 0;
  position: absolute;
  cursor: pointer;
}

.dropbox:hover {
  opacity: 1;
}

.dropbox p {
  text-align: center;
  margin: 0px;
}
</style>
