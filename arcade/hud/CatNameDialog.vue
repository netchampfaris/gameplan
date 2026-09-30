<script setup lang="ts">
import { Button, Dialog, ErrorMessage, FormControl, toast } from 'frappe-ui'
import { ref, watch } from 'vue'
import type { CatSource, CatStatus } from '../interactions/pet'

/**
 * Names or renames the team cat. Anyone can, once a day, and everyone sees the new name.
 * The parent mounts it when it opens, so it starts fresh each time.
 */

const props = defineProps<{ status: CatStatus; source: CatSource }>()
const emit = defineEmits<{ close: []; renamed: [status: CatStatus] }>()

/** The server's limit, `MAX_NAME_LENGTH` in `gp_arcade_cat_day.py`. */
const MAX_LENGTH = 24

const open = ref(true)
watch(open, (isOpen) => {
  if (!isOpen) emit('close')
})

const name = ref(props.status.name ?? '')
const saving = ref(false)
const error = ref('')

async function save() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = 'Give the cat a name.'
    return
  }
  error.value = ''
  saving.value = true
  let status: CatStatus
  try {
    status = await props.source.rename(trimmed)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not rename the cat'
    return
  } finally {
    saving.value = false
  }
  toast.success(`The cat is now ${status.name}`)
  emit('renamed', status)
  open.value = false
}
</script>

<template>
  <Dialog
    v-model:open="open"
    size="sm"
    :title="status.name ? `Rename ${status.name}` : 'Name the cat'"
  >
    <form class="flex flex-col gap-4" @submit.prevent="save">
      <FormControl
        v-model="name"
        label="Name"
        :maxlength="MAX_LENGTH"
        placeholder="Mochi"
        description="Everyone sees the new name. You can rename it once a day."
        autofocus
      />
      <ErrorMessage v-if="error" :message="error" />
    </form>

    <template #actions>
      <div class="flex justify-end">
        <Button variant="solid" label="Save" :loading="saving" @click="save" />
      </div>
    </template>
  </Dialog>
</template>
