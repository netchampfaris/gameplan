<template>
  <div class="mx-auto max-w-4xl space-y-8 px-6 py-8">
    <!-- ─── Section: getList + getCount ─── -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-base font-semibold text-ink-gray-9">Tasks (getList)</h2>
          <span class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6">
            {{ taskCount.data ?? '–' }} total
            <span v-if="taskCount.loading" class="ml-1 italic">…</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" @click="tasks.reload()" :loading="tasks.loading">
            <template #prefix><LucideRefreshCw class="size-3.5" /></template>
            Reload
          </Button>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-3 flex flex-wrap items-center gap-2 border-b border-outline-gray-2 pb-3">
        <Select
          v-model="activeFilters.status"
          :options="statusOptions"
          placeholder="Status"
          variant="ghost"
        >
          <template #prefix>
            <LucideCircleDot class="size-3.5 text-ink-gray-6" />
          </template>
        </Select>
        <Select
          v-model="activeFilters.priority"
          :options="priorityOptions"
          placeholder="Priority"
          variant="ghost"
        >
          <template #prefix>
            <LucideSignal class="size-3.5 text-ink-gray-6" />
          </template>
        </Select>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-gray-6 transition-colors hover:bg-surface-gray-1 hover:text-ink-black"
        >
          Clear filters
        </button>
      </div>

      <!-- Quick-add input -->
      <div class="group mb-0.5 flex items-center gap-2.5 border-b border-outline-gray-2 px-2 py-2">
        <LucidePlus class="size-4 text-ink-gray-5" />
        <input
          v-model="newTaskTitle"
          @keyup.enter="handleAddTask"
          type="text"
          placeholder="New task (Enter to add)"
          class="flex-1 border-none bg-transparent text-sm text-ink-black placeholder-ink-gray-5 outline-none"
        />
      </div>

      <!-- Bulk action bar (visible when items selected) -->
      <div
        v-if="selected.size > 0"
        class="mb-1 flex items-center gap-2 rounded-lg bg-surface-gray-2 px-3 py-2 text-sm"
      >
        <span class="text-ink-gray-7">{{ selected.size }} selected</span>
        <Button
          size="sm"
          variant="subtle"
          :loading="GPTask.bulkUpdate.loading"
          @click="bulkMarkDone"
        >
          <template #prefix><LucideCheckCheck class="size-3.5" /></template>
          Mark Done
        </Button>
        <Button
          size="sm"
          variant="subtle"
          theme="red"
          :loading="GPTask.bulkDelete.loading"
          @click="bulkDelete"
        >
          <template #prefix><LucideTrash2 class="size-3.5" /></template>
          Delete
        </Button>
        <button
          @click="selected.clear()"
          class="ml-auto text-xs text-ink-gray-5 hover:text-ink-black"
        >
          Deselect all
        </button>
      </div>

      <!-- Task rows -->
      <div class="divide-y divide-outline-gray-2">
        <div
          v-for="task in tasks.data"
          :key="task.name"
          class="group flex items-center gap-2.5 px-2 py-2 transition-colors hover:bg-surface-gray-1"
          :class="{ 'bg-surface-gray-1': selected.has(task.name) }"
        >
          <!-- Row select checkbox -->
          <input
            type="checkbox"
            class="size-3.5 accent-ink-black"
            :checked="selected.has(task.name)"
            @change="toggleSelect(task.name)"
          />
          <!-- Complete toggle -->
          <button @click.stop="handleToggleComplete(task)" class="flex-shrink-0">
            <div
              v-if="task.is_completed"
              class="flex size-4 items-center justify-center rounded-full bg-surface-black"
            >
              <LucideCheck class="size-3 text-ink-white" />
            </div>
            <div
              v-else
              class="size-4 rounded-full border border-outline-gray-3 transition-colors group-hover:border-outline-gray-4"
            />
          </button>
          <!-- Title -->
          <div
            @click="$router.push(`/test/${task.name}`)"
            class="flex flex-1 cursor-pointer items-center gap-2"
          >
            <span class="w-24 shrink-0 truncate font-mono text-xs text-ink-gray-4">{{
              task.name
            }}</span>
            <span
              :class="[
                'flex-1 text-sm',
                task.is_completed ? 'text-ink-gray-5 line-through' : 'text-ink-gray-9',
              ]"
              >{{ task.title }}</span
            >
            <span v-if="task.status" class="text-xs text-ink-gray-5">{{ task.status }}</span>
          </div>
          <!-- Delete -->
          <button
            @click.stop="handleDeleteTask(task)"
            class="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <LucideTrash2 class="size-3.5 text-ink-gray-5 hover:text-ink-black" />
          </button>
        </div>

        <div
          v-if="tasks.data.length === 0 && !tasks.loading"
          class="px-2 py-10 text-center text-sm text-ink-gray-5"
        >
          No tasks
        </div>
      </div>

      <div class="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          :disabled="!tasks.hasPreviousPage"
          @click="tasks.previous()"
        >
          <LucideChevronLeft class="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" :disabled="!tasks.hasNextPage" @click="tasks.next()">
          <LucideChevronRight class="size-3.5" />
        </Button>
      </div>
    </section>

    <!-- ─── Section: newDoc draft form ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-gray-9">New Doc (draft form)</h2>
      <p class="mb-4 text-xs text-ink-gray-5">
        <code class="rounded bg-surface-gray-2 px-1 py-0.5">GPTask.newDoc()</code> — local reactive
        draft; persisted only on Insert.
      </p>
      <div class="space-y-3">
        <FormControl
          label="Title"
          v-model="draft.doc.title"
          placeholder="Task title"
          autocomplete="off"
        />
        <FormControl
          label="Status"
          type="select"
          v-model="draft.doc.status"
          :options="statusOptions"
        />
        <div class="flex items-center gap-2">
          <Button variant="solid" :loading="draft.insert.loading" @click="draft.insert.call()">
            Insert
          </Button>
          <span v-if="draft.insert.error" class="text-xs text-red-500">
            {{ draft.insert.error.messages?.[0]?.message }}
          </span>
          <span v-if="draftInserted" class="text-xs text-green-600">
            ✓ Inserted —
            <code class="rounded bg-surface-gray-2 px-1">{{ (draft.doc as any).name }}</code>
          </span>
        </div>
        <div class="rounded-lg bg-surface-gray-2 p-3 text-xs text-ink-gray-7 font-mono">
          draft.doc =
          {{ JSON.stringify({ title: draft.doc.title, status: draft.doc.status }, null, 2) }}
        </div>
      </div>
    </section>

    <!-- ─── Section: Local onError ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-1 text-base font-semibold text-ink-gray-9">Local onError</h2>
      <p class="mb-4 text-xs text-ink-gray-5">
        Pass <code class="rounded bg-surface-gray-2 px-1">onError</code> to any handle to handle
        errors locally. The global toast handler is suppressed for that handle.
      </p>

      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <FormControl
            v-model="localOnErrorDocName"
            placeholder="Enter a doc name (use a bad one to trigger error)"
            autocomplete="off"
            class="flex-1"
          />
          <Button size="sm" variant="solid" @click="fetchLocalDoc">Fetch</Button>
          <Button size="sm" variant="ghost" @click="clearLocalDoc">Clear</Button>
        </div>

        <div
          v-if="localDocError"
          class="flex items-start gap-2 rounded-lg border border-outline-gray-2 bg-surface-gray-1 px-3 py-2.5 text-sm"
        >
          <LucideAlertCircle class="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <div class="font-medium text-ink-gray-9">{{ localDocError.title }}</div>
            <div class="text-xs text-ink-gray-6">
              {{ localDocError.messages[0]?.message }}
            </div>
          </div>
        </div>

        <div
          v-else-if="localDoc"
          class="rounded-lg bg-surface-gray-2 p-3 font-mono text-xs text-ink-gray-7"
        >
          <div v-if="localDoc.loading" class="text-ink-gray-4">Loading…</div>
          <pre v-else-if="localDoc.doc">{{ JSON.stringify(localDoc.doc, null, 2) }}</pre>
        </div>
      </div>
    </section>

    <!-- ─── Section: getCount ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-gray-9">getCount</h2>
      <p class="mb-4 text-xs text-ink-gray-5">
        Reactive document count. Filter updates automatically trigger a refetch.
      </p>
      <div class="flex flex-wrap gap-4">
        <div
          v-for="s in ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']"
          :key="s"
          class="flex min-w-[90px] flex-col items-center justify-center gap-1 rounded-xl border border-outline-gray-2 px-4 py-3"
        >
          <span class="text-2xl font-semibold text-ink-gray-9">
            {{ getStatusCount(s)?.data ?? '–' }}
          </span>
          <span class="text-xs text-ink-gray-5">{{ s }}</span>
        </div>
      </div>
    </section>

    <!-- ─── Section: bulkUpdate ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-gray-9">bulkUpdate</h2>
      <p class="mb-3 text-xs text-ink-gray-5">
        Select tasks in the list above, then use the bulk action bar. Or use the quick panel:
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="s in ['Backlog', 'Todo', 'In Progress', 'Done']"
          :key="s"
          size="sm"
          variant="outline"
          :loading="GPTask.bulkUpdate.loading"
          :disabled="selected.size === 0"
          @click="bulkSetStatus(s)"
        >
          Set → {{ s }}
        </Button>
      </div>
      <p v-if="selected.size === 0" class="mt-2 text-xs text-ink-gray-4">
        Select rows in the task list first.
      </p>
      <div
        v-if="lastBulkResult"
        class="mt-3 rounded-lg bg-surface-gray-2 p-2 text-xs font-mono text-ink-gray-7"
      >
        Last result: {{ lastBulkResult }}
      </div>
    </section>

    <!-- ─── Section: Realtime (onUpdate) ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-gray-9">Realtime events</h2>
      <p class="mb-3 text-xs text-ink-gray-5">
        <code class="rounded bg-surface-gray-2 px-1">GPTask.onUpdate</code> — fires when the server
        pushes a <code>list_update</code> socket event. Update any GP Task from another tab to see
        events appear here.
      </p>
      <div class="flex items-center gap-2">
        <Button size="sm" :variant="realtimeActive ? 'solid' : 'outline'" @click="toggleRealtime">
          <template #prefix>
            <LucideRadio class="size-3.5" />
          </template>
          {{ realtimeActive ? 'Listening…' : 'Start listening' }}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          @click="realtimeLog.splice(0)"
          :disabled="realtimeLog.length === 0"
        >
          Clear
        </Button>
      </div>
      <div
        class="mt-3 max-h-48 overflow-y-auto rounded-lg bg-surface-gray-2 p-3 font-mono text-xs text-ink-gray-7"
      >
        <div v-if="realtimeLog.length === 0" class="text-ink-gray-4">No events yet.</div>
        <div v-for="(entry, i) in realtimeLog" :key="i">{{ entry }}</div>
      </div>
    </section>

    <!-- ─── Section: Arbitrary socket event ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-1 text-base font-semibold text-ink-gray-9">Arbitrary realtime event</h2>
      <p class="mb-4 text-xs text-ink-gray-5">
        <code class="rounded bg-surface-gray-2 px-1">socket.on(event, handler)</code> listens to any
        event published via
        <code class="rounded bg-surface-gray-2 px-1">frappe.publish_realtime()</code>. The
        unsubscribe function returned by
        <code class="rounded bg-surface-gray-2 px-1">socket.on</code> removes the handler. Try it by
        running
        <code class="rounded bg-surface-gray-2 px-1">bench execute gameplan.debug.emit_ping</code>
        while listening.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <FormControl
          v-model="customEventName"
          placeholder="Event name (e.g. my_event)"
          autocomplete="off"
          class="w-56"
        />
        <Button
          size="sm"
          :variant="customEventActive ? 'solid' : 'outline'"
          :disabled="!customEventName.trim()"
          @click="toggleCustomEvent"
        >
          <template #prefix><LucideRadio class="size-3.5" /></template>
          {{ customEventActive ? 'Listening…' : 'Listen' }}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          @click="customEventLog.splice(0)"
          :disabled="customEventLog.length === 0"
        >
          Clear
        </Button>
      </div>
      <div
        class="mt-3 max-h-48 overflow-y-auto rounded-lg bg-surface-gray-2 p-3 font-mono text-xs text-ink-gray-7"
      >
        <div v-if="customEventLog.length === 0" class="text-ink-gray-4">No events yet.</div>
        <div v-for="(entry, i) in customEventLog" :key="i">{{ entry }}</div>
      </div>
    </section>

    <!-- ─── Section: File Upload ─── -->
    <section class="rounded-xl border border-outline-gray-2 p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-gray-9">File Upload</h2>
      <p class="mb-3 text-xs text-ink-gray-5">
        <code class="rounded bg-surface-gray-2 px-1">uploadFile()</code> — XHR with reactive
        progress.
      </p>
      <div class="space-y-3">
        <input
          type="file"
          ref="fileInput"
          class="block text-sm text-ink-gray-7"
          @change="onFileSelected"
        />
        <div v-if="upload" class="space-y-2">
          <div class="flex items-center gap-2">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-surface-gray-3">
              <div
                class="h-full rounded-full bg-ink-black transition-all"
                :style="{ width: `${upload.progress}%` }"
              />
            </div>
            <span class="w-10 text-right text-xs text-ink-gray-6">{{ upload.progress }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="solid" :loading="upload.loading" @click="upload.call()">
              Upload
            </Button>
            <Button size="sm" variant="ghost" @click="upload.abort()" :disabled="!upload.loading">
              Abort
            </Button>
          </div>
          <div v-if="upload.error" class="text-xs text-red-500">
            {{ upload.error.messages?.[0]?.message ?? upload.error.title }}
          </div>
          <div
            v-if="upload.data"
            class="rounded-lg bg-surface-gray-2 p-2 font-mono text-xs text-ink-gray-7"
          >
            {{ JSON.stringify(upload.data, null, 2) }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { GPDiscussion, GPTask, type GPTaskInterface } from '@/doctypes'
import { socket } from '@/client'
import { Button, Select, FormControl, useList } from 'frappe-ui'
import { useSessionUser } from '@/data/users'
import { uploadFile, type UploadHandle } from '../../../frappe-ui/frappe/client/vue/uploadFile'
import type { FrappeResponseError } from '../../../frappe-ui/frappe/client/core/FrappeResponseError'
import type { VueDocHandle } from '../../../frappe-ui/frappe/client/vue'

const router = useRouter()
const sessionUser = useSessionUser()

// ── getList ──────────────────────────────────────────────────────────────────

const activeFilters = ref({
  status: undefined as string | undefined,
  priority: undefined as string | undefined,
})

const tasks = GPTask.getList({
  fields: ['*'],
  filters: () => ({
    owner: sessionUser.name,
    ...activeFilters.value,
  }),
  orderBy: 'creation desc',
  limit: 10,
  debounce: 300,
})

GPDiscussion.moveDiscussions.call({ discussions: [] }).then((r) => {
  // r.
})

// ── getCount ─────────────────────────────────────────────────────────────────

const taskCount = GPTask.getCount({
  filters: () => ({ owner: sessionUser.name }),
})

// Per-status counts — one handle per status, created once
const statusCounts: Record<string, ReturnType<typeof GPTask.getCount>> = {}
for (const s of ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']) {
  statusCounts[s] = GPTask.getCount({ filters: { status: s, owner: sessionUser.name } })
}
function getStatusCount(s: string) {
  return statusCounts[s]
}

// ── newDoc ────────────────────────────────────────────────────────────────────

const draft = GPTask.newDoc({ title: '', status: 'Backlog' })
const draftInserted = ref(false)

const _draftInsertCall = draft.insert.call.bind(draft.insert)
draft.insert.call = async (...args: Parameters<typeof _draftInsertCall>) => {
  draftInserted.value = false
  const result = await _draftInsertCall(...args)
  draftInserted.value = true
  tasks.reload()
  return result
}

// ── bulk select ───────────────────────────────────────────────────────────────

const selected = reactive(new Set<string>())
const lastBulkResult = ref<string | null>(null)

function toggleSelect(name: string) {
  if (selected.has(name)) selected.delete(name)
  else selected.add(name)
}

async function bulkDelete() {
  const names = [...selected]
  await GPTask.bulkDelete.callOptimistic(names)
  names.forEach((n) => selected.delete(n))
  taskCount.reload()
}

async function bulkMarkDone() {
  await bulkSetStatus('Done')
}

async function bulkSetStatus(status: string) {
  const rows = [...selected].map((name) => ({ name, status: status as GPTaskInterface['status'] }))
  const result = await GPTask.bulkUpdate.callOptimistic(rows)
  lastBulkResult.value = `Updated ${result.length} docs to status="${status}"`
  selected.clear()
}

// ── realtime ─────────────────────────────────────────────────────────────────

const realtimeLog = ref<string[]>([])
const realtimeActive = ref(false)
let unsubUpdate: (() => void) | null = null

function toggleRealtime() {
  if (realtimeActive.value) {
    unsubUpdate?.()
    unsubUpdate = null
    realtimeActive.value = false
  } else {
    unsubUpdate = GPTask.onUpdate((name) => {
      realtimeLog.value.unshift(`[update] ${name} — ${new Date().toLocaleTimeString()}`)
    })
    realtimeActive.value = true
  }
}

onUnmounted(() => {
  unsubUpdate?.()
})

// ── arbitrary socket event ────────────────────────────────────────────────────

const customEventName = ref('my_event')
const customEventLog = ref<string[]>([])
const customEventActive = ref(false)
let unsubCustom: (() => void) | null = null

function toggleCustomEvent() {
  if (customEventActive.value) {
    unsubCustom?.()
    unsubCustom = null
    customEventActive.value = false
  } else {
    const event = customEventName.value.trim()
    if (!event) return
    unsubCustom = socket.on(event, (payload: unknown) => {
      customEventLog.value.unshift(
        `[${event}] ${JSON.stringify(payload)} — ${new Date().toLocaleTimeString()}`,
      )
    })
    customEventActive.value = true
  }
}

onUnmounted(() => {
  unsubCustom?.()
})

// ── file upload ───────────────────────────────────────────────────────────────

const fileInput = ref<HTMLInputElement | null>(null)
const upload = ref<UploadHandle | null>(null)

function onFileSelected() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  upload.value = uploadFile({ file, isPrivate: false })
}

// ── local onError demo ────────────────────────────────────────────────────────

const localOnErrorDocName = ref('')
const localDocError = ref<FrappeResponseError | null>(null)
const localDoc = ref<VueDocHandle<any> | null>(null)

function fetchLocalDoc() {
  if (!localOnErrorDocName.value.trim()) return
  localDocError.value = null
  localDoc.value = GPTask.getDoc(localOnErrorDocName.value.trim(), {
    onError(err) {
      // Handled locally — global toast is suppressed
      localDocError.value = err
      localDoc.value = null
    },
  })
}

function clearLocalDoc() {
  localOnErrorDocName.value = ''
  localDoc.value = null
  localDocError.value = null
}

// ── quick-add (insert optimistic) ────────────────────────────────────────────

const newTaskTitle = ref('')

function handleAddTask() {
  if (!newTaskTitle.value.trim()) return
  const title = newTaskTitle.value.trim()
  newTaskTitle.value = ''
  tasks.insert.callOptimistic({ title }, { title, is_completed: true })
  taskCount.reload()
}

// ── toggle / delete ───────────────────────────────────────────────────────────

function handleToggleComplete(task: GPTaskInterface) {
  tasks.setValue.callOptimistic({ name: task.name, is_completed: !task.is_completed })
}

function handleDeleteTask(task: GPTaskInterface) {
  tasks.delete.callOptimistic(task.name)
  selected.delete(task.name)
  taskCount.reload()
}

// ── helpers ───────────────────────────────────────────────────────────────────

const hasActiveFilters = computed(() =>
  Object.values(activeFilters.value).some((v) => v !== undefined && v !== null && v !== ''),
)

const statusOptions = [
  { label: 'Backlog', value: 'Backlog' },
  { label: 'Todo', value: 'Todo' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Done', value: 'Done' },
  { label: 'Canceled', value: 'Canceled' },
]

const priorityOptions = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Urgent', value: 'Urgent' },
]

function clearFilters() {
  activeFilters.value = { status: undefined, priority: undefined }
}
</script>
