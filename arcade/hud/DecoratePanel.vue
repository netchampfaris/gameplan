<script setup lang="ts">
import { Button, dialog, TabButtons, Tooltip } from 'frappe-ui'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { DecorateCommand, DecorateState } from '../bridge'
import { homeProblemText } from '../maps/home'
import { catalogName, homeCategories, lockableItems } from '../maps/homeCatalog'
import { prefabs, type PrefabId } from '../maps/prefabs'
import { floors, wallpapers, type FloorId, type WallpaperId } from '../maps/rooms'
import TilePicture from './TilePicture.vue'
import { floorPicture, prefabPicture, wallpaperPicture } from './tileImages'

/**
 * Decorate mode's panel: the furniture catalog, wallpapers and floors, and Save. The
 * game owns the draft (`state`); this panel only sends commands and shows it.
 *
 * Lockable items the player has not unlocked show grayed out with a hint, and cannot be
 * picked up. One already in the Home can still be moved.
 */

const props = defineProps<{
  state: DecorateState
  saving: boolean
  /** Ids of the lockable items the player has unlocked. */
  unlocked: ReadonlySet<string>
}>()
const emit = defineEmits<{ command: [command: DecorateCommand]; save: []; cancel: [] }>()

const CATEGORY_ICONS: Record<string, string> = {
  seating: 'lucide-sofa',
  tables: 'lucide-utensils',
  beds: 'lucide-bed-double',
  storage: 'lucide-archive',
  plants: 'lucide-sprout',
  lights: 'lucide-lamp',
  rugs: 'lucide-rectangle-horizontal',
  wall: 'lucide-frame',
  fun: 'lucide-gamepad-2',
  seasonal: 'lucide-sparkles',
}

const tab = ref<'furniture' | 'room'>('furniture')
const categoryId = ref(homeCategories[0]?.id ?? '')
const category = computed(() =>
  homeCategories.find((candidate) => candidate.id === categoryId.value),
)

/** The category's items; `locked` says how to get one the player has not unlocked yet. */
const items = computed(() =>
  (category.value?.items ?? []).map((id) => {
    const hint = props.unlocked.has(id) ? null : lockableItems.get(id)?.hint
    return { id, locked: hint ? `${prefabs[id].name} is locked. ${hint}.` : null }
  }),
)

// A tooltip does not show on touch, so picking a locked item also says why in the footer.
const lockedPick = ref<string | null>(null)
watch([categoryId, () => props.state.holding], () => (lockedPick.value = null))

const wallpaperIds = Object.keys(wallpapers) as WallpaperId[]
const floorIds = Object.keys(floors) as FloorId[]

/** "light-blue" as "Light blue", for swatches that have only an id. */
function swatchName(id: string): string {
  const words = id.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Every Home keeps its guestbook: it can move, but not go.
const canRemove = computed(() => props.state.picked && props.state.holding !== 'guestbook')

function pick(prefab: PrefabId, locked: string | null) {
  if (locked) {
    lockedPick.value = locked
    return
  }
  emit('command', props.state.holding === prefab ? { action: 'drop' } : { action: 'hold', prefab })
}

function cancel() {
  if (!props.state.dirty) {
    emit('cancel')
    return
  }
  dialog.confirm({
    title: 'Discard your changes?',
    message: 'Your Home goes back to how it was when you last saved.',
    confirmLabel: 'Discard',
    onConfirm: () => emit('cancel'),
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName))
    return
  if (event.key === 'Escape' && props.state.holding) {
    event.preventDefault()
    event.stopPropagation()
    emit('command', { action: 'drop' })
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && canRemove.value) {
    event.preventDefault()
    emit('command', { action: 'remove' })
  }
}

// Tell the game how much of the screen the panel covers, so it frames the room beside it.
const panel = useTemplateRef<HTMLElement>('panel')
let observer: ResizeObserver | null = null

function reportInset() {
  const element = panel.value
  const parent = element?.offsetParent
  if (!element || !parent) return
  const box = element.getBoundingClientRect()
  const area = parent.getBoundingClientRect()
  // A panel across the bottom (small screens) covers the bottom; otherwise the right.
  const acrossBottom = box.width > area.width * 0.8
  emit('command', {
    action: 'inset',
    right: acrossBottom ? 0 : Math.round(area.right - box.left),
    bottom: acrossBottom ? Math.round(area.bottom - box.top) : 0,
  })
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  observer = new ResizeObserver(reportInset)
  if (panel.value) observer.observe(panel.value)
  window.addEventListener('resize', reportInset)
  reportInset()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', reportInset)
  observer?.disconnect()
})
</script>

<template>
  <aside
    ref="panel"
    class="absolute inset-x-2 bottom-2 flex h-[46dvh] flex-col overflow-hidden rounded-7 bg-surface-elevation-2 shadow-2xl sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:h-auto sm:w-[22rem]"
    aria-label="Decorate your Home"
  >
    <header class="flex flex-col gap-3 px-4 pb-3 pt-4">
      <div class="flex items-center gap-2">
        <span class="lucide-paintbrush size-4 text-ink-gray-6" aria-hidden="true" />
        <h2 class="text-lg-semibold text-ink-gray-9">Decorate</h2>
      </div>
      <TabButtons
        v-model="tab"
        fluid
        :options="[
          { value: 'furniture', label: 'Furniture' },
          { value: 'room', label: 'Walls and floor' },
        ]"
      />
    </header>

    <div v-if="tab === 'furniture'" class="flex min-h-0 flex-1 border-t border-outline-gray-1">
      <nav
        class="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-outline-gray-1 py-2"
        aria-label="Categories"
      >
        <Tooltip v-for="entry in homeCategories" :key="entry.id" :text="entry.label" side="left">
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-5 text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-8"
            :class="{ '!bg-surface-gray-3 !text-ink-gray-9': entry.id === categoryId }"
            :aria-label="entry.label"
            :aria-pressed="entry.id === categoryId"
            @click="categoryId = entry.id"
          >
            <span
              :class="CATEGORY_ICONS[entry.id] ?? 'lucide-box'"
              class="size-4"
              aria-hidden="true"
            />
          </button>
        </Tooltip>
      </nav>
      <div class="min-w-0 flex-1 overflow-y-auto p-2">
        <h3 class="px-1 pb-2 pt-1 text-sm-medium text-ink-gray-5">{{ category?.label }}</h3>
        <ul class="grid grid-cols-3 gap-1.5">
          <li v-for="{ id, locked } in items" :key="id">
            <Tooltip :text="locked ?? ''" :disabled="!locked">
              <button
                type="button"
                class="relative flex w-full flex-col items-center gap-1 rounded-5 bg-surface-gray-1 px-1 pb-1.5 pt-2"
                :class="[
                  locked ? 'cursor-default' : 'hover:bg-surface-gray-2 active:bg-surface-gray-3',
                  { 'ring-2 ring-outline-gray-5': state.holding === id },
                ]"
                :aria-pressed="state.holding === id"
                :aria-disabled="locked ? true : undefined"
                :aria-label="locked ?? catalogName(id)"
                :title="locked ? undefined : catalogName(id)"
                @click="pick(id, locked)"
              >
                <span
                  class="flex size-16 items-center justify-center"
                  :class="{ 'opacity-40 grayscale': locked }"
                >
                  <TilePicture :picture="prefabPicture(id)" :size="64" />
                </span>
                <span
                  v-if="locked"
                  class="lucide-lock absolute right-1.5 top-1.5 size-3 text-ink-gray-5"
                  aria-hidden="true"
                />
                <span
                  class="w-full truncate text-center text-xs"
                  :class="locked ? 'text-ink-gray-4' : 'text-ink-gray-6'"
                  aria-hidden="true"
                  >{{ prefabs[id].name }}</span
                >
              </button>
            </Tooltip>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-else
      class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-outline-gray-1 p-4"
    >
      <section class="flex flex-col gap-2">
        <h3 class="text-sm-medium text-ink-gray-5">Wallpaper</h3>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="id in wallpaperIds"
            :key="id"
            type="button"
            class="flex aspect-square items-center justify-center overflow-hidden rounded-4 ring-offset-2 ring-offset-surface-elevation-2 hover:opacity-90"
            :class="{ 'ring-2 ring-outline-gray-5': state.home.wallpaper === id }"
            :aria-label="swatchName(id)"
            :title="swatchName(id)"
            :aria-pressed="state.home.wallpaper === id"
            @click="emit('command', { action: 'surface', wallpaper: id })"
          >
            <TilePicture :picture="wallpaperPicture(id)" :size="56" />
          </button>
        </div>
      </section>
      <section class="flex flex-col gap-2">
        <h3 class="text-sm-medium text-ink-gray-5">Floor</h3>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="id in floorIds"
            :key="id"
            type="button"
            class="flex aspect-square items-center justify-center overflow-hidden rounded-4 ring-offset-2 ring-offset-surface-elevation-2 hover:opacity-90"
            :class="{ 'ring-2 ring-outline-gray-5': state.home.floor === id }"
            :aria-label="swatchName(id)"
            :title="swatchName(id)"
            :aria-pressed="state.home.floor === id"
            @click="emit('command', { action: 'surface', floor: id })"
          >
            <TilePicture :picture="floorPicture(id)" :size="56" />
          </button>
        </div>
      </section>
    </div>

    <footer class="flex flex-col gap-3 border-t border-outline-gray-1 p-3">
      <div class="flex min-h-7 items-center gap-2 pl-1">
        <template v-if="state.holding">
          <span
            class="min-w-0 flex-1 text-p-sm"
            :class="state.problem ? 'text-ink-gray-8' : 'text-ink-gray-5'"
          >
            <template v-if="state.problem">{{ homeProblemText[state.problem] }}</template>
            <template v-else>Click to place it</template>
          </span>
          <Button
            v-if="canRemove"
            size="sm"
            variant="ghost"
            icon-left="lucide-trash-2"
            label="Remove"
            @click="emit('command', { action: 'remove' })"
          />
          <Button
            size="sm"
            variant="ghost"
            label="Put back"
            @click="emit('command', { action: 'drop' })"
          />
        </template>
        <span v-else-if="tab === 'room'" class="text-p-sm text-ink-gray-5"
          >Pick a wallpaper and a floor.</span
        >
        <span
          v-else-if="lockedPick"
          class="flex min-w-0 items-center gap-1.5 text-p-sm text-ink-gray-8"
        >
          <span class="lucide-lock size-3.5 shrink-0 text-ink-gray-5" aria-hidden="true" />
          <span class="min-w-0">{{ lockedPick }}</span>
        </span>
        <span v-else class="text-p-sm text-ink-gray-5"
          >Pick something to place, or click an item in the room to move it.</span
        >
      </div>
      <div class="flex gap-2">
        <Button class="flex-1" label="Cancel" @click="cancel" />
        <Button
          class="flex-1"
          variant="solid"
          label="Save"
          :disabled="!state.dirty"
          :loading="saving"
          @click="emit('save')"
        />
      </div>
    </footer>
  </aside>
</template>
