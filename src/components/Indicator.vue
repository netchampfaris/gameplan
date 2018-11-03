<template>
  <div slot="info-left" class="indicator">
    <div class="indicator-blue"></div>
  </div>
</template>
<style scoped>
.indicator {
  width: 1rem;
  height: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.indicator-blue {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-blue);
}
</style>
