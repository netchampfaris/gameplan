<script setup lang="ts">
import { Dialog, ErrorMessage, Skeleton, TextInput, useCall } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import { toAppearance, defaultAppearance, type AvatarAppearance } from '../avatar/catalog'
import type { RoomCounts, RoomId } from '../net/protocol'
import AvatarFace from './AvatarFace.vue'

/**
 * The elevator's panel: everyone's Home, the player's own first, with how many people
 * are in each right now. Picking one takes the player there.
 */

interface DirectoryEntry {
  user: string
  full_name: string
  appearance: unknown
}

const props = defineProps<{
  user: string
  room: RoomId | null
  loadCounts: () => Promise<RoomCounts>
}>()
const emit = defineEmits<{ visit: [user: string] }>()
const open = defineModel<boolean>('open', { required: true })

const directory = useCall<DirectoryEntry[]>({
  url: '/api/v2/method/GP Arcade Profile/get_home_directory',
  immediate: false,
})
const counts = ref<RoomCounts>({})
const query = ref('')

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    query.value = ''
    void directory.fetch()
    props
      .loadCounts()
      .then((next) => (counts.value = next))
      .catch(() => (counts.value = {}))
  },
  { immediate: true },
)

interface Row {
  user: string
  name: string
  appearance: AvatarAppearance
  isOwn: boolean
  isHere: boolean
  count: number
}

const rows = computed<Row[]>(() => {
  const entries = directory.data ?? []
  const needle = query.value.trim().toLowerCase()
  return entries
    .map((entry) => ({
      user: entry.user,
      name: entry.full_name,
      appearance: toAppearance(entry.appearance, defaultAppearance(entry.user)),
      isOwn: entry.user === props.user,
      isHere: props.room === `home:${entry.user}`,
      count: counts.value[`home:${entry.user}`] ?? 0,
    }))
    .filter(
      (row) =>
        !needle ||
        row.name.toLowerCase().includes(needle) ||
        row.user.toLowerCase().includes(needle),
    )
    .sort(
      (a, b) =>
        Number(b.isOwn) - Number(a.isOwn) || b.count - a.count || a.name.localeCompare(b.name),
    )
})

function visit(row: Row) {
  if (row.isHere) return
  emit('visit', row.user)
}
</script>

<template>
  <Dialog v-model:open="open" size="md" title="Visit homes">
    <div class="flex flex-col gap-3">
      <TextInput v-model="query" placeholder="Find a teammate" autofocus>
        <template #prefix>
          <span class="lucide-search size-4 text-ink-gray-5" aria-hidden="true" />
        </template>
      </TextInput>

      <ErrorMessage v-if="directory.error" :message="directory.error" />
      <div v-else-if="!directory.data" class="flex flex-col gap-1">
        <div v-for="index in 5" :key="index" class="flex items-center gap-3 px-2 py-2">
          <Skeleton class="size-8 rounded-full" />
          <Skeleton class="h-4 w-40" />
        </div>
      </div>
      <p v-else-if="!rows.length" class="px-3 py-10 text-center text-p-sm text-ink-gray-4">
        Nobody by that name
      </p>
      <ul v-else class="-mx-1 max-h-[55vh] overflow-y-auto">
        <li v-for="row in rows" :key="row.user">
          <button
            type="button"
            class="group flex w-full items-center gap-3 rounded-5 px-2 py-1.5 text-left hover:bg-surface-gray-2 active:bg-surface-gray-3 disabled:cursor-default disabled:hover:bg-transparent"
            :disabled="row.isHere"
            @click="visit(row)"
          >
            <AvatarFace :appearance="row.appearance" :size="32" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-base text-ink-gray-8">
                {{ row.isOwn ? 'Your Home' : row.name }}
              </div>
              <div v-if="row.isHere" class="mt-1 text-sm text-ink-gray-5">You are here</div>
              <div
                v-else-if="row.count"
                class="mt-1 flex items-center gap-1.5 text-sm text-ink-gray-5"
              >
                <span class="size-1.5 rounded-full bg-surface-gray-7" aria-hidden="true" />
                {{ row.count === 1 ? '1 person here' : `${row.count} people here` }}
              </div>
            </div>
            <span
              v-if="!row.isHere"
              class="lucide-arrow-right size-4 text-ink-gray-4 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>
  </Dialog>
</template>
