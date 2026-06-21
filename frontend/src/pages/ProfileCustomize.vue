<template>
  <div class="min-h-full bg-surface-base">
    <PageHeader>
      <Breadcrumbs class="h-7" :items="profileCustomizeBreadcrumbs" />
      <div class="flex shrink-0 items-center gap-2">
        <Button
          v-for="option in profileCardTypeOptions"
          :key="option.type"
          :icon-left="option.icon"
          @click="addCard(option.type)"
        >
          {{ option.label }}
        </Button>
        <Button
          variant="solid"
          icon-left="lucide-save"
          :loading="isSaving"
          :disabled="!isDirty"
          @click="saveProfileBentoDraft"
        >
          Save
        </Button>
      </div>
    </PageHeader>

    <div class="mx-auto flex w-full max-w-[1180px] gap-6 px-4 pb-32 pt-6 sm:px-6 sm:pb-40">
      <main class="min-w-0 flex-1">
        <ProfileBentoGrid
          :cards="cards"
          :selected-card-id="selectedCardId"
          interactive
          :repositioning-card-id="repositioningCardId"
          show-size
          @cancel-image-reposition="repositioningCardId = ''"
          @reorder="reorderCards"
          @save-image-position="saveImagePosition"
          @select="selectedCardId = $event"
        />
      </main>

      <ProfileBentoEditorPanel
        :card="selectedCard"
        :text-characters-left="selectedTextCharactersLeft"
        @remove="removeSelectedCard"
        @reposition-image="beginImageReposition"
        @upload-image="updateSelectedImage"
        @update-image-rendering="(imageRendering) => updateSelectedCard({ imageRendering })"
        @update-size="(size) => updateSelectedCard({ size })"
        @update-text="updateSelectedText"
        @update-title="(title) => updateSelectedCard({ title })"
        @update-url="(url) => updateSelectedCard({ url })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { Breadcrumbs, Button, toast, usePageMeta } from 'frappe-ui'
import PageHeader from '@/components/PageHeader.vue'
import ProfileBentoEditorPanel from '@/components/ProfileBento/ProfileBentoEditorPanel.vue'
import ProfileBentoGrid from '@/components/ProfileBento/ProfileBentoGrid.vue'
import { createServerProfileBentoSource } from '@/components/ProfileBento/profileBentoSource'
import { profileCardTypeOptions } from '@/components/ProfileBento/types'
import { useProfileBentoCustomization } from '@/components/ProfileBento/useProfileBentoCustomization'
import { useSessionUser } from '@/data/users'

const sessionUser = useSessionUser()
const profileCustomizeBreadcrumbs = computed(() => [
  { label: 'People', route: { name: 'People' } },
  {
    label: sessionUser.full_name || 'Profile',
    route: sessionUser.user_profile
      ? { name: 'PersonProfileProfile', params: { personId: sessionUser.user_profile } }
      : undefined,
  },
  { label: 'Customize', route: { name: 'ProfileCustomize' }, isPageTitle: true },
])

const profileBentoSource = createServerProfileBentoSource()
const repositioningCardId = ref('')
const {
  cards,
  selectedCardId,
  selectedCard,
  selectedTextCharactersLeft,
  isDirty,
  isSaving,
  loadDraft,
  saveDraft,
  addCard,
  reorderCards,
  removeSelectedCard,
  updateSelectedCard,
  updateSelectedImage,
  updateSelectedText,
} = useProfileBentoCustomization(profileBentoSource)

onMounted(loadDraft)
useEventListener(window, 'keydown', handleCustomizeKeydown)

usePageMeta(() => {
  return {
    title: 'Customize Profile | Gameplan',
  }
})

function handleCustomizeKeydown(event: KeyboardEvent) {
  if (event.key !== 'Delete') return
  if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return
  if (!selectedCard.value) return

  event.preventDefault()
  removeSelectedCard()
}

async function saveProfileBentoDraft() {
  try {
    await saveDraft()
    toast.success('Profile layout saved')
  } catch (error) {
    toast.error(getSaveErrorMessage(error))
  }
}

function beginImageReposition() {
  if (!selectedCard.value || selectedCard.value.type !== 'Image' || !selectedCard.value.image)
    return
  repositioningCardId.value = selectedCard.value.id
}

function saveImagePosition(imagePosition: number) {
  updateSelectedCard({ imagePosition })
  repositioningCardId.value = ''
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
  )
}

function getSaveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes('PermissionError')) {
    return 'You do not have permission to save this profile layout'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Could not save profile layout'
}
</script>
