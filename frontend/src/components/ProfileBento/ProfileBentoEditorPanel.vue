<template>
  <aside class="hidden w-[320px] shrink-0 lg:block">
    <div class="sticky top-5 space-y-4">
      <div v-if="card" class="rounded-lg border border-outline-gray-2 bg-surface-base p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-medium text-ink-gray-9">{{ card.type }} card</h2>
          </div>
          <Button icon="lucide-trash-2" @click="$emit('remove')" />
        </div>

        <div class="mt-4 space-y-3">
          <FormControl
            v-if="card.type !== 'Blank'"
            label="Title"
            :model-value="card.title"
            @update:model-value="updateTitle"
          />
          <FormControl
            v-if="card.type === 'Text'"
            label="Text"
            type="textarea"
            :rows="4"
            :model-value="card.text"
            @update:model-value="updateText"
          >
            <template #suffix>
              <span class="text-sm text-ink-gray-5">{{ textCharactersLeft }}</span>
            </template>
          </FormControl>
          <FormControl
            v-if="card.type === 'Text'"
            label="URL"
            :model-value="card.url"
            placeholder="https://example.com"
            @update:model-value="updateUrl"
          />

          <div>
            <div class="mb-1.5 text-sm text-ink-gray-6">Size</div>
            <TabButtons
              :buttons="profileCardSizeButtons"
              :model-value="card.size"
              @update:model-value="updateSize"
            />
          </div>

          <div v-if="card.type === 'Image'">
            <div class="mb-3">
              <div class="mb-1.5 text-sm text-ink-gray-6">Rendering</div>
              <TabButtons
                :options="profileImageRenderingOptions"
                :model-value="card.imageRendering || 'Cover'"
                @update:model-value="updateImageRendering"
              />
            </div>
            <Button
              v-if="canRepositionImage"
              class="mb-3"
              icon-left="lucide-move-vertical"
              @click="$emit('repositionImage')"
            >
              Reposition
            </Button>
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-ink-gray-6">Image</div>
                <FileUploader
                  :fileTypes="['image/png', 'image/jpeg']"
                  :uploadArgs="{ optimize: true }"
                  :validateFile="validateImageFile"
                  @success="updateImage"
                >
                  <template #default="{ progress, error, uploading, openFileSelector }">
                    <div class="relative mt-2">
                      <Button
                        icon-left="lucide-upload"
                        :loading="uploading"
                        @click="openFileSelector"
                      >
                        {{ uploading ? `${progress}%` : 'Upload' }}
                      </Button>
                      <ErrorMessage
                        v-if="error"
                        class="absolute right-0 top-9 z-10 w-52 rounded border border-outline-gray-2 bg-surface-base p-2 shadow-sm"
                        :message="error"
                      />
                    </div>
                  </template>
                </FileUploader>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button, ErrorMessage, FileUploader, FormControl, TabButtons } from 'frappe-ui'
import {
  profileCardSizes,
  profileImageRenderingOptions,
  type ProfileBentoCard,
  type ProfileCardSize,
  type ProfileImageRendering,
} from './types'

interface UploadedFile {
  file_url: string
}

const props = defineProps<{
  card?: ProfileBentoCard
  textCharactersLeft: number
}>()

const emit = defineEmits<{
  remove: []
  repositionImage: []
  uploadImage: [fileUrl: string]
  updateImageRendering: [value: ProfileImageRendering]
  updateSize: [value: ProfileCardSize]
  updateText: [value: string]
  updateTitle: [value: string]
  updateUrl: [value: string]
}>()

const profileCardSizeButtons = profileCardSizes.map((size) => ({ label: size }))
const canRepositionImage = computed(() => {
  return (
    props.card?.type === 'Image' &&
    Boolean(props.card.image) &&
    (props.card.imageRendering || 'Cover') === 'Cover'
  )
})

function updateImage(file: UploadedFile) {
  emit('uploadImage', file.file_url)
}

function updateImageRendering(value: ProfileImageRendering) {
  emit('updateImageRendering', value)
}

function updateTitle(value: string) {
  emit('updateTitle', value)
}

function updateText(value: string) {
  emit('updateText', value)
}

function updateUrl(value: string) {
  emit('updateUrl', value)
}

function updateSize(value: ProfileCardSize) {
  emit('updateSize', value)
}

function validateImageFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['png', 'jpg', 'jpeg'].includes(extension)) {
    return 'Only PNG and JPG images are allowed'
  }
}
</script>
