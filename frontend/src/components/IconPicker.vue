<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverAnchor as-child>
      <slot v-bind="{ isOpen, togglePopover }">
        <Button :icon="modelValue || 'lucide-plus'" label="Space Icon" @click="togglePopover()" />
      </slot>
    </PopoverAnchor>

    <PopoverPortal>
      <PopoverContent
        side="bottom"
        align="start"
        :side-offset="6"
        :collision-padding="12"
        class="z-[100] outline-none"
        @open-auto-focus.prevent="focusSearch"
      >
        <div
          class="w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-surface-elevation-2 text-base shadow-2xl ring-1 ring-black ring-opacity-5"
          style="transform-origin: var(--reka-popover-content-transform-origin)"
        >
          <div class="border-b border-outline-gray-1 p-2">
            <label
              class="flex h-8 items-center rounded-md bg-surface-gray-1 px-2 ring-1 ring-outline-gray-2 focus-within:bg-surface-white focus-within:ring-outline-gray-4"
            >
              <span class="lucide-search size-4 shrink-0 text-ink-gray-5" />
              <input
                ref="searchInput"
                v-model="search"
                type="text"
                class="ml-2 h-full min-w-0 flex-1 bg-transparent text-sm text-ink-gray-8 outline-none placeholder:text-ink-gray-5"
                placeholder="Search icons"
                @keydown.escape.stop="closePopover"
              />
            </label>
          </div>
          <div class="relative">
            <div class="max-h-72 overflow-y-auto p-2 pb-5">
              <div class="grid grid-cols-8 gap-0.5" role="listbox" aria-label="Space icons">
                <button
                  v-for="icon in filteredIcons"
                  :key="icon.class"
                  type="button"
                  role="option"
                  class="flex size-8 items-center justify-center rounded-md text-ink-gray-7 hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                  :class="icon.class === modelValue ? 'bg-surface-gray-3 text-ink-gray-9' : ''"
                  :title="icon.label"
                  :aria-label="icon.label"
                  :aria-selected="icon.class === modelValue"
                  @click="selectIcon(icon.class, togglePopover)"
                >
                  <span :class="[icon.class, 'size-5']" />
                </button>
              </div>
              <div v-if="!filteredIcons.length" class="py-8 text-center text-sm text-ink-gray-5">
                No icons found
              </div>
            </div>
            <div
              v-if="filteredIcons.length"
              class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface-elevation-2 to-transparent"
            />
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'

type IconOption = {
  class: string
  label: string
  keywords?: string[]
}

defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const search = ref('')
const isOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

const icons: IconOption[] = [
  { class: 'lucide-megaphone', label: 'Announcements', keywords: ['broadcast'] },
  { class: 'lucide-radio', label: 'Broadcast', keywords: ['updates', 'channel'] },
  { class: 'lucide-audio-waveform', label: 'Audio', keywords: ['voice', 'sound'] },
  { class: 'lucide-book-open-text', label: 'Knowledge', keywords: ['docs', 'wiki'] },
  { class: 'lucide-notebook-pen', label: 'Notes', keywords: ['writing', 'journal'] },
  { class: 'lucide-briefcase', label: 'Work', keywords: ['business'] },
  { class: 'lucide-handshake', label: 'Partners', keywords: ['clients', 'agreement'] },
  { class: 'lucide-landmark', label: 'Institution', keywords: ['company', 'office'] },
  { class: 'lucide-warehouse', label: 'Warehouse', keywords: ['operations', 'storage'] },
  { class: 'lucide-factory', label: 'Factory', keywords: ['manufacturing'] },
  { class: 'lucide-scale', label: 'Legal', keywords: ['policy', 'fairness'] },
  { class: 'lucide-gavel', label: 'Decisions', keywords: ['legal', 'judgment'] },
  { class: 'lucide-vault', label: 'Vault', keywords: ['secure', 'archive'] },
  { class: 'lucide-key-round', label: 'Access', keywords: ['keys', 'permission'] },
  { class: 'lucide-package', label: 'Package', keywords: ['shipping', 'product'] },
  { class: 'lucide-boxes', label: 'Inventory', keywords: ['packages', 'storage'] },
  { class: 'lucide-blocks', label: 'Blocks', keywords: ['modules', 'components'] },
  { class: 'lucide-graduation-cap', label: 'Learning', keywords: ['education'] },
  { class: 'lucide-rocket', label: 'Launch', keywords: ['project'] },
  { class: 'lucide-trophy', label: 'Wins', keywords: ['success'] },
  { class: 'lucide-medal', label: 'Awards', keywords: ['recognition'] },
  { class: 'lucide-crown', label: 'Leadership', keywords: ['executive'] },
  { class: 'lucide-gem', label: 'Premium', keywords: ['special'] },
  { class: 'lucide-diamond', label: 'Diamond', keywords: ['quality'] },
  { class: 'lucide-gift', label: 'Gifts', keywords: ['rewards'] },
  { class: 'lucide-party-popper', label: 'Celebrations', keywords: ['party'] },
  { class: 'lucide-wand-sparkles', label: 'Magic', keywords: ['automation'] },
  { class: 'lucide-sparkles', label: 'Sparkles', keywords: ['magic'] },
  { class: 'lucide-flame', label: 'Flame', keywords: ['hot'] },
  { class: 'lucide-zap', label: 'Energy', keywords: ['fast'] },
  { class: 'lucide-lightbulb', label: 'Ideas', keywords: ['brainstorm'] },
  { class: 'lucide-brain', label: 'Research', keywords: ['thinking'] },
  { class: 'lucide-atom', label: 'Science', keywords: ['research'] },
  { class: 'lucide-beaker', label: 'Experiment', keywords: ['lab'] },
  { class: 'lucide-flask-conical', label: 'Lab', keywords: ['experiment'] },
  { class: 'lucide-microscope', label: 'Analysis', keywords: ['research'] },
  { class: 'lucide-dna', label: 'Biology', keywords: ['science'] },
  { class: 'lucide-cpu', label: 'Systems', keywords: ['hardware'] },
  { class: 'lucide-circuit-board', label: 'Circuit', keywords: ['hardware'] },
  { class: 'lucide-component', label: 'Components', keywords: ['engineering'] },
  { class: 'lucide-network', label: 'Network', keywords: ['systems'] },
  { class: 'lucide-webhook', label: 'Integrations', keywords: ['api'] },
  { class: 'lucide-bot', label: 'Bots', keywords: ['automation'] },
  { class: 'lucide-waypoints', label: 'Waypoints', keywords: ['flow'] },
  { class: 'lucide-pencil-ruler', label: 'Planning', keywords: ['design'] },
  { class: 'lucide-drafting-compass', label: 'Architecture', keywords: ['planning'] },
  { class: 'lucide-paintbrush', label: 'Creative', keywords: ['design'] },
  { class: 'lucide-gallery-horizontal', label: 'Gallery', keywords: ['media'] },
  { class: 'lucide-camera', label: 'Photo', keywords: ['media'] },
  { class: 'lucide-clapperboard', label: 'Video', keywords: ['film'] },
  { class: 'lucide-headphones', label: 'Music', keywords: ['audio'] },
  { class: 'lucide-mic-vocal', label: 'Podcast', keywords: ['voice'] },
  { class: 'lucide-boom-box', label: 'Entertainment', keywords: ['music'] },
  { class: 'lucide-gamepad-2', label: 'Games', keywords: ['play'] },
  { class: 'lucide-volleyball', label: 'Sports', keywords: ['games'] },
  { class: 'lucide-ferris-wheel', label: 'Fun', keywords: ['events'] },
  { class: 'lucide-dumbbell', label: 'Fitness', keywords: ['health'] },
  { class: 'lucide-heart-pulse', label: 'Health', keywords: ['wellness'] },
  { class: 'lucide-life-buoy', label: 'Support', keywords: ['help'] },
  { class: 'lucide-earth', label: 'Earth', keywords: ['world'] },
  { class: 'lucide-route', label: 'Roadmap', keywords: ['path'] },
  { class: 'lucide-plane', label: 'Travel', keywords: ['flight'] },
  { class: 'lucide-ship', label: 'Shipping', keywords: ['boat'] },
  { class: 'lucide-sailboat', label: 'Sailing', keywords: ['boat'] },
  { class: 'lucide-train-front', label: 'Transport', keywords: ['travel'] },
  { class: 'lucide-radar', label: 'Radar', keywords: ['tracking'] },
  { class: 'lucide-satellite', label: 'Satellite', keywords: ['space'] },
  { class: 'lucide-orbit', label: 'Orbit', keywords: ['space'] },
  { class: 'lucide-telescope', label: 'Telescope', keywords: ['space'] },
  { class: 'lucide-sprout', label: 'Growth', keywords: ['nature'] },
  { class: 'lucide-leaf', label: 'Leaf', keywords: ['nature'] },
  { class: 'lucide-mountain', label: 'Mountain', keywords: ['outdoors'] },
  { class: 'lucide-tree-pine', label: 'Forest', keywords: ['nature'] },
  { class: 'lucide-flower-2', label: 'Garden', keywords: ['nature'] },
  { class: 'lucide-waves', label: 'Waves', keywords: ['water'] },
  { class: 'lucide-cloud', label: 'Cloud', keywords: ['weather'] },
  { class: 'lucide-umbrella', label: 'Umbrella', keywords: ['weather'] },
  { class: 'lucide-tent', label: 'Camp', keywords: ['outdoors'] },
  { class: 'lucide-fish', label: 'Fish', keywords: ['water'] },
  { class: 'lucide-paw-print', label: 'Animals', keywords: ['pets'] },
  { class: 'lucide-squirrel', label: 'Squirrel', keywords: ['animals'] },
  { class: 'lucide-puzzle', label: 'Puzzle', keywords: ['problems'] },
  { class: 'lucide-origami', label: 'Origami', keywords: ['craft'] },
  { class: 'lucide-pyramid', label: 'Pyramid', keywords: ['structure'] },
  { class: 'lucide-infinity', label: 'Infinity', keywords: ['ongoing'] },
  { class: 'lucide-signature', label: 'Signature', keywords: ['approval'] },
  { class: 'lucide-scan', label: 'Scan', keywords: ['review'] },
]

const filteredIcons = computed(() => {
  let query = search.value.trim().toLowerCase()
  if (!query) {
    return icons
  }

  return icons.filter((icon) => {
    let keywords = [icon.label, icon.class.replace('lucide-', ''), ...(icon.keywords || [])]
      .join(' ')
      .toLowerCase()
    return keywords.includes(query)
  })
})

function selectIcon(icon: string, togglePopover: () => void) {
  emit('update:modelValue', icon)
  togglePopover()
}

function togglePopover(flag?: boolean | Event) {
  if (flag instanceof Event || flag === undefined) {
    isOpen.value = !isOpen.value
    return
  }

  isOpen.value = flag
}

function closePopover() {
  isOpen.value = false
}

function focusSearch() {
  nextTick(() => searchInput.value?.focus())
}

watch(isOpen, (value) => {
  if (value) {
    focusSearch()
  } else {
    search.value = ''
  }
})
</script>
