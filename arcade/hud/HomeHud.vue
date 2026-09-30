<script setup lang="ts">
import { Button, LoadingIndicator, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ArcadeBridge } from '../bridge'
import type { Home } from '../maps/home'
import type { RoomCounts, RoomId } from '../net/protocol'
import DecoratePanel from './DecoratePanel.vue'
import HomeDirectory from './HomeDirectory.vue'
import { errorText } from './useHomes'

/**
 * Everything about Homes on top of the world: which Home this is, the elevator's
 * directory, Decorate mode, and keeping the address bar on the Room the player is in.
 */

const props = defineProps<{
  bridge: ArcadeBridge
  user: string
  /** The Home in the address bar (`/g/arcade/home/:user`), if any. */
  home: string | undefined
  loadCounts: () => Promise<RoomCounts>
  saveHome: (home: Home) => Promise<void>
  /** Ids of the lockable items the signed-in user has unlocked. */
  unlocked: ReadonlySet<string>
}>()

const state = computed(() => props.bridge.state)
const isOwner = computed(() => state.value.home?.owner === props.user)
const placeName = computed(() => {
  const home = state.value.home
  if (!home) return null
  return isOwner.value ? 'Your Home' : `${home.ownerName}'s Home`
})

const directoryOpen = computed({
  get: () => state.value.directoryOpen,
  set: (open) => (state.value.directoryOpen = open),
})

watch(
  () => state.value.notice,
  (notice) => {
    if (!notice) return
    toast.error(notice)
    state.value.notice = null
  },
)

// The address bar follows the player, and a new address takes the player there.
const router = useRouter()

function homeOf(room: RoomId): string | undefined {
  return room.startsWith('home:') ? room.slice('home:'.length) : undefined
}

watch(
  () => state.value.room,
  (room) => {
    if (!room) return
    const user = homeOf(room)
    if (user === props.home) return
    void router.replace(
      user ? { name: 'Arcade', params: { place: 'home', user } } : { name: 'Arcade', params: {} },
    )
  },
)

watch(
  () => props.home,
  (user) => {
    const room = state.value.room
    if (!room || homeOf(room) === user) return
    props.bridge.travel(user ? { kind: 'home', user } : { kind: 'common' })
  },
)

// Decorate mode.
const saving = ref(false)

async function save() {
  const draft = state.value.decorate?.home
  if (!draft || saving.value) return
  saving.value = true
  try {
    await props.saveHome(draft)
  } catch (error) {
    toast.error(errorText(error, 'Could not save your Home'))
    return
  } finally {
    saving.value = false
  }
  props.bridge.decorate({ action: 'end', saved: draft })
  toast.success('Home saved')
}
</script>

<template>
  <div
    v-if="placeName && !state.decorate"
    class="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-7 bg-surface-elevation-2 py-1.5 pl-3 pr-1.5 shadow-lg"
    :class="{ 'pr-3': !isOwner }"
  >
    <span class="lucide-house size-4 shrink-0 text-ink-gray-6" aria-hidden="true" />
    <span class="max-w-48 truncate text-base-medium text-ink-gray-8">{{ placeName }}</span>
    <Button
      v-if="isOwner"
      size="sm"
      icon-left="lucide-paintbrush"
      label="Decorate"
      @click="bridge.decorate({ action: 'start' })"
    />
  </div>

  <div
    v-if="state.travelling"
    class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-7 bg-surface-elevation-2 px-3 py-2 shadow-lg"
    role="status"
  >
    <LoadingIndicator class="size-4 text-ink-gray-6" />
    <span class="text-base text-ink-gray-7">Opening the Home</span>
  </div>

  <HomeDirectory
    v-model:open="directoryOpen"
    :user="user"
    :room="state.room"
    :load-counts="loadCounts"
    @visit="bridge.travel({ kind: 'home', user: $event })"
  />

  <DecoratePanel
    v-if="state.decorate"
    :state="state.decorate"
    :saving="saving"
    :unlocked="unlocked"
    @command="bridge.decorate($event)"
    @save="save"
    @cancel="bridge.decorate({ action: 'end', saved: null })"
  />
</template>
