<template>
  <div class="file-drop-area">
    <span>Cmd + Enter to post</span> <span>Drop files here to attach</span>
  </div>
</template>
<style scoped>
.file-drop-area {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  font-weight: 300;
  color: var(--text-grey);
  width: 100%;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.file-drop-area span {
  display: inline-block;
}
</style>
