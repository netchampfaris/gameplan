<script setup lang="ts">
import { Alert, Button, toast } from 'frappe-ui'
import type { Socket } from 'socket.io-client'
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { ArcadeGame } from './ArcadeGame'
import type { AvatarAppearance } from './avatar/catalog'
import { ArcadeBridge } from './bridge'
import type { CatStatus } from './interactions/pet'
import AvatarCustomizer from './hud/AvatarCustomizer.vue'
import CatCard from './hud/CatCard.vue'
import CatNameDialog from './hud/CatNameDialog.vue'
import ChatInput from './hud/ChatInput.vue'
import DailyPuzzle from './hud/DailyPuzzle.vue'
import DatesPanel from './hud/DatesPanel.vue'
import Darts from './hud/Darts.vue'
import EmoteBar from './hud/EmoteBar.vue'
import GuestbookBadge from './hud/GuestbookBadge.vue'
import HomeHud from './hud/HomeHud.vue'
import InteractPrompt from './hud/InteractPrompt.vue'
import NoteBoard from './hud/NoteBoard.vue'
import PartyCard from './hud/PartyCard.vue'
import PlantCard from './hud/PlantCard.vue'
import WhoIsHere from './hud/WhoIsHere.vue'
import { ArcadeNet } from './net/ArcadeNet'
import { EMOTES } from './net/protocol'
import { useArcadeProfile } from './hud/useArcadeProfile'
import { useCatSource } from './hud/useCat'
import { useCelebrationClaim, useCelebrationSource } from './hud/useCelebrations'
import { useHomeSource } from './hud/useHomes'
import { usePlantSource } from './hud/usePlant'
import { useSeason } from './hud/useSeason'
import { useUnlockNotices } from './hud/useUnlockNotices'

/**
 * The Arcade page. Phaser draws the world into `gameRoot`; Vue draws the HUD on top.
 * The two talk only through one `ArcadeBridge`, and the world reaches the server through
 * one `ArcadeNet`, both made here and handed to the game.
 */

const props = defineProps<{
  /** Gameplan's realtime socket; null if it could not be set up. */
  socket: Socket | null
  user: string
  /** Start in this user's Home (`/g/arcade/home/:user`) instead of the Common Room. */
  home?: string
}>()

const gameRoot = useTemplateRef<HTMLElement>('gameRoot')
const chat = useTemplateRef<InstanceType<typeof ChatInput>>('chat')
const profile = useArcadeProfile(props.user)
const homes = useHomeSource()
const plants = usePlantSource()
const celebrations = useCelebrationSource()
const cats = useCatSource()
useUnlockNotices(props.socket, profile.reload)
const season = useSeason()
const claimCelebrationItems = useCelebrationClaim()

const bridge = shallowRef<ArcadeBridge | null>(null)
let net: ArcadeNet | null = null
let game: ArcadeGame | null = null

const customizerOpen = ref(false)
const datesOpen = ref(false)
/** The team cat being named: the Interactable that follows it and its status then. */
const naming = ref<{ target: string; status: CatStatus } | null>(null)
const chatFocused = ref(false)

// Start once the saved look is known, so nobody sees the default look flash first.
watch(
  [() => profile.isReady.value, gameRoot],
  ([ready, root]) => {
    if (!ready || !root || !props.socket || bridge.value) return
    const created = new ArcadeBridge(profile.appearance.value)
    net = new ArcadeNet(props.socket)
    game = new ArcadeGame()
    const start = props.home
      ? { kind: 'home' as const, user: props.home }
      : { kind: 'common' as const }
    game.mount(root, { bridge: created, net, homes, plants, celebrations, cats, season }, start)
    bridge.value = created
    if (!profile.hasSaved.value) customizerOpen.value = true
    // After the profile has loaded: an unlock reloads it, and in frappe-ui a useList
    // reload during its first load leaves the aborted request's AbortError in `error`.
    claimCelebrationItems()
  },
  { immediate: true },
)

watch(
  [
    chatFocused,
    customizerOpen,
    datesOpen,
    naming,
    () => bridge.value?.state.board ?? null,
    () => bridge.value?.state.directoryOpen ?? false,
    () => bridge.value?.state.decorate ?? null,
    () => bridge.value?.state.puzzleOpen ?? false,
    () => bridge.value?.state.darts ?? null,
  ],
  ([focused, open, dates, cat, board, directory, decorate, puzzle, darts]) => {
    bridge.value?.setKeyboardOwner(
      focused || open || dates || cat || board || directory || decorate || puzzle || darts
        ? 'hud'
        : 'game',
    )
  },
)

// Say when someone else in the Room throws a dart.
watch(
  () => bridge.value?.state.lastDart ?? null,
  (dart) => {
    if (!dart) return
    toast.info(dart.score ? `${dart.fullName} scored ${dart.score}` : `${dart.fullName} missed`)
  },
)

const state = computed(() => bridge.value?.state ?? null)
/** The shared plant, while the player stands next to it. */
const plantInReach = computed(() => {
  const plant = state.value?.plant
  return plant && state.value?.prompt?.target === plant.target ? plant.status : null
})
/** Today's celebrations, while the player stands at the party corner. */
const partyInReach = computed(() => {
  const party = state.value?.party
  return party && state.value?.prompt?.target === party.target ? party.celebrations : null
})
/** The team cat, while the player stands next to it. */
const catInReach = computed(() => {
  const cat = state.value?.cat
  return cat && state.value?.prompt?.target === cat.target ? cat : null
})

const problem = computed(() => {
  if (!props.socket) return 'Realtime is not available, so the Arcade cannot connect.'
  if (profile.error.value) return 'Could not load your Arcade profile.'
  if (state.value?.connection === 'failed') return state.value.error ?? 'Could not join the Arcade.'
  return null
})

async function saveAppearance(appearance: AvatarAppearance) {
  try {
    await profile.save(appearance)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save your look')
    return
  }
  bridge.value?.setAppearance(appearance)
  customizerOpen.value = false
}

function loadCounts() {
  return net ? net.roomCounts() : Promise.resolve({})
}

/** Keys the game does not own: Enter opens the chat, 1 to 8 emote. */
function onKeydown(event: KeyboardEvent) {
  const current = bridge.value
  if (!current || current.state.keyboard !== 'game') return
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target))
    return
  if (event.key === 'Enter') {
    event.preventDefault()
    chat.value?.focus()
    return
  }
  const emote = EMOTES[Number(event.key) - 1]
  if (/^[1-9]$/.test(event.key) && emote) current.emote(emote)
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

window.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  game?.destroy()
  net?.destroy()
  bridge.value?.destroy()
})
</script>

<template>
  <div class="relative h-[100dvh] w-full overflow-hidden bg-surface-black">
    <div ref="gameRoot" class="h-full w-full" />

    <div v-if="problem" class="absolute inset-x-0 top-4 flex justify-center px-4">
      <Alert theme="red" :title="problem" class="w-full max-w-md shadow-lg" />
    </div>

    <template v-if="state && bridge">
      <WhoIsHere
        v-if="state.occupants.length && !state.decorate"
        :occupants="state.occupants"
        class="absolute right-4 top-4"
      />
      <GuestbookBadge
        v-if="state.room === `home:${user}` && !state.decorate"
        :user="user"
        :board="state.board"
        :revision="state.boardRevision"
        class="absolute left-4 top-4"
      />

      <div
        v-if="!state.decorate"
        class="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-3 px-4"
      >
        <PlantCard v-if="plantInReach" :status="plantInReach" :user="user" />
        <PartyCard v-if="partyInReach" :celebrations="partyInReach" :user="user" />
        <CatCard
          v-if="catInReach"
          :status="catInReach.status"
          :user="user"
          @rename="naming = { ...catInReach }"
        />
        <InteractPrompt v-if="state.prompt" :label="state.prompt.label" />
        <div
          class="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-7 bg-surface-elevation-2 p-1.5 shadow-lg"
        >
          <ChatInput
            ref="chat"
            @send="bridge.say($event)"
            @focus="chatFocused = true"
            @blur="chatFocused = false"
          />
          <div class="hidden h-6 w-px bg-surface-gray-3 sm:block" />
          <EmoteBar @emote="bridge.emote($event)" />
          <div class="h-6 w-px bg-surface-gray-3" />
          <Button
            variant="ghost"
            icon="lucide-shirt"
            tooltip="Customize your look"
            @click="customizerOpen = true"
          />
          <Button
            variant="ghost"
            icon="lucide-cake"
            tooltip="Your dates"
            @click="datesOpen = true"
          />
        </div>
      </div>

      <HomeHud
        :bridge="bridge"
        :user="user"
        :home="home"
        :load-counts="loadCounts"
        :save-home="profile.saveHome"
        :unlocked="profile.unlocked.value"
      />
      <AvatarCustomizer
        v-model:open="customizerOpen"
        :appearance="state.appearance"
        :saving="profile.isSaving.value"
        :welcome="!profile.hasSaved.value"
        @save="saveAppearance"
      />
      <NoteBoard
        v-if="state.board"
        :key="state.board.target"
        :board="state.board"
        :user="user"
        :revision="state.boardRevision"
        @close="bridge.closeBoard()"
        @changed="state.board && bridge.notesChanged(state.board.target)"
      />
      <DatesPanel v-if="datesOpen" @close="datesOpen = false" @saved="claimCelebrationItems()" />
      <CatNameDialog
        v-if="naming"
        :status="naming.status"
        :source="cats"
        @close="naming = null"
        @renamed="naming && bridge.catRenamed(naming.target, $event)"
      />
      <DailyPuzzle v-if="state.puzzleOpen" :user="user" @close="state.puzzleOpen = false" />
      <Darts
        v-if="state.darts"
        :key="state.darts"
        :user="user"
        :last-dart="state.lastDart"
        @close="state.darts = null"
        @thrown="state.darts && bridge.dartThrown(state.darts, $event)"
      />
    </template>
  </div>
</template>
