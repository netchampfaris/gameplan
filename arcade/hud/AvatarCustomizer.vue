<script setup lang="ts">
import { Button, Dialog } from 'frappe-ui'
import { ref, toRaw, watch } from 'vue'
import {
  accessoryLabel,
  AvatarCatalog,
  randomAppearance,
  type AvatarAppearance,
} from '../avatar/catalog'
import AvatarPreview from './AvatarPreview.vue'
import PartPicker from './PartPicker.vue'
import SwatchPicker from './SwatchPicker.vue'

/**
 * Picks how the player looks. Edits a draft shown in the preview; the world only changes
 * when the parent saves it.
 */

const props = defineProps<{
  appearance: AvatarAppearance
  saving: boolean
  /** First visit: say what this is for. */
  welcome: boolean
}>()
const emit = defineEmits<{ save: [appearance: AvatarAppearance] }>()
const open = defineModel<boolean>('open', { required: true })

// A copy, so editing the draft never touches the saved look.
const copy = (appearance: AvatarAppearance) => structuredClone(toRaw(appearance))
const draft = ref(copy(props.appearance))
watch(open, (isOpen) => {
  if (isOpen) draft.value = copy(props.appearance)
})
</script>

<template>
  <Dialog
    v-model:open="open"
    size="xl"
    :title="welcome ? 'Welcome to the Arcade' : 'Customize your look'"
  >
    <!-- Dialog drops `message` when it has content, so the welcome line lives here. -->
    <p v-if="welcome" class="mb-5 text-p-base text-ink-gray-7">
      Pick how you look to everyone here. You can change it any time.
    </p>
    <div class="flex flex-col gap-5 sm:flex-row">
      <div class="flex shrink-0 items-center justify-center rounded-7 bg-surface-gray-2 px-6 py-4">
        <AvatarPreview :appearance="draft" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-ink-gray-5">Skin</span>
          <SwatchPicker v-model="draft.body" label="Skin" :colors="AvatarCatalog.bodies" />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm text-ink-gray-5">Eyes</span>
          <SwatchPicker v-model="draft.eyes" label="Eyes" :colors="AvatarCatalog.eyes" />
        </div>
        <PartPicker
          :model-value="draft.hairstyle"
          label="Hair"
          :entries="AvatarCatalog.hairstyles"
          @update:model-value="(part) => part && (draft.hairstyle = part)"
        />
        <PartPicker
          :model-value="draft.outfit"
          label="Outfit"
          :entries="AvatarCatalog.outfits"
          @update:model-value="(part) => part && (draft.outfit = part)"
        />
        <PartPicker
          v-model="draft.accessory"
          label="Accessory"
          :entries="AvatarCatalog.accessories"
          :name-of="accessoryLabel"
          optional
        />
      </div>
    </div>

    <template #actions>
      <div class="flex items-center justify-between gap-2">
        <Button
          variant="subtle"
          icon-left="lucide-shuffle"
          label="Randomize"
          @click="draft = randomAppearance()"
        />
        <Button variant="solid" label="Save" :loading="saving" @click="emit('save', draft)" />
      </div>
    </template>
  </Dialog>
</template>
