<template>
  <FileUploader
    :fileTypes="['image/png', 'image/jpeg']"
    :uploadArgs="{ optimize: true }"
    :validateFile="validateFile"
    @success="saveImage"
  >
    <template #default="{ file, progress, error, uploading, openFileSelector }">
      <div class="relative size-7">
        <button
          type="button"
          class="group/image relative flex size-7 items-center justify-center overflow-hidden rounded-[7px] bg-surface-gray-1 outline-none transition-[border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100"
          :class="getButtonBorderClass(file)"
          :aria-label="`Upload image for ${community.title}`"
          :aria-busy="uploading || saving"
          :disabled="uploading || saving"
          @click="openFileSelector"
        >
          <CommunityImage :community="previewCommunity(file)" class="size-full" />
          <span
            class="absolute inset-0 rounded-[6px] bg-surface-base opacity-0 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:opacity-100 group-focus/image:opacity-100"
            :class="{ 'opacity-100': uploading || saving }"
          >
            <span
              class="absolute inset-1 grid place-items-center rounded-full text-ink-gray-7 opacity-0 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 group-focus/image:scale-100 group-focus/image:opacity-100"
              :class="uploading || saving ? 'scale-100 opacity-100' : 'scale-90'"
            >
              <span v-if="uploading" class="text-xs-medium">{{ progress }}%</span>
              <span v-else-if="saving" class="lucide-loader-circle size-3.5 animate-spin" />
              <span v-else class="lucide-image-up size-3.5" />
            </span>
          </span>
        </button>
        <ErrorMessage
          v-if="error || saveError"
          class="absolute left-0 top-8 z-10 w-48 rounded border bg-surface-base p-2 shadow-sm"
          :message="saveError || error"
        />
      </div>
    </template>
  </FileUploader>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ErrorMessage, FileUploader, useDoctype } from 'frappe-ui'
import CommunityImage from '@/components/CommunityImage.vue'
import { communities, type Community } from '@/data/communities'
import type { GPTeam } from '@/types/doctypes'

interface UploadedFile {
  file_url: string
}

const props = defineProps<{
  community: Community
}>()

const teams = useDoctype<GPTeam>('GP Team')
const previewUrls = new Map<File, string>()
const currentFile = ref<File | null>(null)
const uploadedPreviewFile = ref<File | null>(null)
const uploadedImageUrl = ref('')
const saving = ref(false)
const saveError = ref('')

const baseCommunity = computed(() => props.community)

function previewCommunity(file: File | null) {
  trackCurrentFile(file)

  return {
    ...baseCommunity.value,
    image: getImageUrl(file),
  }
}

async function saveImage(uploadedFile: UploadedFile) {
  uploadedPreviewFile.value = currentFile.value
  uploadedImageUrl.value = uploadedFile.file_url
  saveError.value = ''
  saving.value = true

  try {
    await teams.setValue.submit({
      name: props.community.name,
      image: uploadedFile.file_url,
    })
    await communities.reload()
  } catch (error) {
    saveError.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

function getImageUrl(file: File | null) {
  if (file && file === uploadedPreviewFile.value && uploadedImageUrl.value) {
    return uploadedImageUrl.value
  }

  if (file) {
    return getPreviewUrl(file)
  }

  return props.community.image
}

function getButtonBorderClass(file: File | null) {
  if (getImageUrl(file)) return ''
  return 'border border-outline-gray-1 hover:border-outline-gray-3 focus:border-outline-gray-4'
}

function getPreviewUrl(file: File) {
  const existingUrl = previewUrls.get(file)
  if (existingUrl) return existingUrl

  const url = URL.createObjectURL(file)
  previewUrls.set(file, url)
  return url
}

function trackCurrentFile(file: File | null) {
  if (!file || file === currentFile.value) return

  currentFile.value = file
  uploadedPreviewFile.value = null
  uploadedImageUrl.value = ''
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['png', 'jpg', 'jpeg'].includes(extension)) {
    return 'Only PNG and JPG images are allowed'
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Could not update community image'
}

onBeforeUnmount(() => {
  for (const url of previewUrls.values()) {
    URL.revokeObjectURL(url)
  }
})
</script>
