<template>
  <Dialog title="Change category title" v-model:open="show">
    <FormControl label="Title" v-model="categoryTitle" autofocus />
    <template #actions>
      <div class="flex justify-end">
        <Button
          variant="solid"
          :disabled="!category"
          @click="handleSubmit"
          :loading="GPTeam.setValue.loading"
        >
          Submit
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, FormControl, Button } from 'frappe-ui'
import { GPTeam } from '@/doctypes'
import type { GroupedSpaceItem } from '@/data/groupedSpaces'

const show = ref(false)
const categoryTitle = ref('')
const category = ref<GroupedSpaceItem | null>(null)

function openDialog(groupCategory: GroupedSpaceItem) {
  category.value = groupCategory
  categoryTitle.value = groupCategory.title
  show.value = true
}

function handleSubmit() {
  if (category.value) {
    GPTeam.setValue
      .call({
        name: category.value.name,
        title: categoryTitle.value,
      })
      .then(() => {
        show.value = false
        category.value = null
        categoryTitle.value = ''
      })
  }
}

// Watch for dialog close to reset state
watch(show, (newValue) => {
  if (!newValue) {
    category.value = null
    categoryTitle.value = ''
  }
})

defineExpose({
  openDialog,
})
</script>
