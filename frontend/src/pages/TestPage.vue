<template>
  <div class="mx-auto max-w-4xl px-6 py-8">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-medium text-ink-gray-9">Tasks</h1>
      <Badge v-if="tasks.loading">Loading...</Badge>
      <Button @click="tasks.reload()" :loading="tasks.loading">
        <LucideRefreshCw class="size-4" />
      </Button>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex items-center gap-2 border-b border-outline-gray-2 pb-3">
      <Combobox
        v-model="activeFilters.assigned_to"
        :options="assigneeOptions"
        placeholder="Assignee"
        variant="ghost"
      >
        <template #prefix>
          <LucideUser class="shrink-0 size-3.5 text-ink-gray-6" />
        </template>
      </Combobox>

      <!-- <select class="form-select">
        <option>Backlog</option>
        <option>In Progress</option>
        <option>Done</option>
      </select> -->

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

    <!-- Add Task Input -->
    <div
      class="group mb-0.5 flex items-center gap-2.5 border-b border-outline-gray-2 px-2 py-2 transition-colors hover:bg-surface-gray-1"
    >
      <LucidePlus class="size-4 text-ink-gray-5" />
      <input
        v-model="newTaskTitle"
        @keyup.enter="handleAddTask"
        type="text"
        placeholder="New task"
        class="flex-1 border-none bg-transparent text-sm text-ink-black placeholder-ink-gray-5 outline-none"
      />
    </div>

    <!-- Task List -->
    <div class="divide-y divide-outline-gray-2">
      <div
        v-for="task in tasks.data"
        :key="task.name"
        class="group flex items-center gap-2.5 px-2 py-2 transition-colors hover:bg-surface-gray-1"
      >
        <!-- Checkbox -->
        <button @click.stop="handleToggleComplete(task)" class="flex-shrink-0">
          <div
            v-if="task.is_completed"
            class="flex size-4 items-center justify-center rounded-full bg-surface-black"
          >
            <LucideCheck class="size-3 text-ink-gray-9" />
          </div>
          <div
            v-else
            class="size-4 rounded-full border border-outline-gray-3 transition-colors group-hover:border-outline-gray-4"
          />
        </button>

        <!-- Task Content - Clickable -->
        <div @click="openTaskDialog(task)" class="flex flex-1 cursor-pointer items-center gap-2.5">
          <div class="font-mono text-ink-gray-6 text-sm">{{ task.name }}</div>
          <!-- Task Title -->
          <div
            :class="[
              'flex-1 text-sm',
              task.is_completed ? 'text-ink-gray-5 line-through' : 'text-ink-gray-9',
            ]"
          >
            {{ task.title }}
          </div>

          <!-- Task Meta -->
          <div class="flex items-center gap-2 text-xs text-ink-gray-5">
            <span v-if="task.status">
              {{ task.status }}
            </span>
            <span v-if="task.due_date">{{ formatDate(task.due_date) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <button
          @click.stop="handleDeleteTask(task)"
          class="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <LucideTrash2 class="size-3.5 text-ink-gray-5 transition-colors hover:text-ink-black" />
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="!tasks.data || tasks.data.length === 0"
        class="px-2 py-12 text-center text-sm text-ink-gray-5"
      >
        No tasks
      </div>
    </div>

    <!-- Task Edit Dialog -->
    <Dialog v-model="showTaskDialog" :options="{ title: 'Edit Task' }">
      <template #body-content>
        <div v-if="editingTask" class="space-y-4">
          <FormControl label="Title" v-model="editingTask.title" autocomplete="off" required />
          <div>
            <label class="mb-1.5 block text-sm text-ink-gray-9">Description</label>
            <TextEditor
              :content="editingTask.description"
              @change="(val) => (editingTask.description = val)"
              :editable="true"
              :placeholder="'Add description...'"
              editor-class="min-h-[120px] max-h-[300px] overflow-y-auto prose-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <Combobox
              v-model="editingTask.assigned_to"
              :options="assigneeOptions"
              placeholder="Assign to"
            />

            <!-- <Select
              v-model="editingTask.status"
              :options="statusOptions"
              placeholder="Status"
              variant="outline"
            /> -->
            <select>
              <option>Backlog</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>

            <Select
              v-model="editingTask.priority"
              :options="priorityOptions"
              placeholder="Priority"
              variant="outline"
            />

            <DatePicker
              v-model="editingTask.due_date"
              placeholder="Due date"
              format="D MMM, YYYY"
            />
          </div>
        </div>
      </template>
      <template #actions>
        <div class="flex gap-2">
          <Button variant="outline" @click="showTaskDialog = false"> Cancel </Button>
          <Button variant="solid" @click="saveTaskChanges"> Save Changes </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { GPTask, GPTaskInterface, GPDiscussion } from '@/doctypes'
import { Button, Combobox, Dialog, Select, FormControl, DatePicker } from 'frappe-ui'
import { useSessionUser, activeUsers } from '@/data/users'
import TextEditor from '@/components/TextEditor.vue'

// let sendmail = GPTask.sendMail.create()

// GPTask.sendMail.submit({ email: 'asdf' })

// task.trackVisit.submit()
// task.trackVisit.loading
// task.trackVisit.error
// task.trackVisit.data

// task.setValue.submit({ description: 'asdf'})

// let tasks = GPTask.getList({
//   fields
// })

// GPTask.getDoc

// GPTask.getList

// GPTask.getListCustom.submit({
//     fields
// })

// let d = GPDiscussion.getDoc('id')

// let n = GPDiscussion.notifyMentions.submit()

// d.trackVisit.submit()

const router = useRouter()

const sessionUser = useSessionUser()

// Filter state
const activeFilters = ref({
  status: undefined as string | undefined,
  assigned_to: undefined as string | undefined,
  priority: undefined as string | undefined,
})

const tasks = GPTask.getList({
  fields: ['*'],
  filters: () => ({
    owner: sessionUser.name,
    ...activeFilters.value,
  }),
  orderBy: 'creation desc',
  limit: 50,
  debounce: 500,
})

// GPTask.bulkUpdate

const newTaskTitle = ref('')

// Task edit dialog state
const showTaskDialog = ref(false)
const editingTask = ref<Partial<GPTaskInterface> | null>(null)

const hasActiveFilters = computed(() => {
  return Object.values(activeFilters.value).some((v) => v !== undefined && v !== null && v !== '')
})

// Filter options
const assigneeOptions = computed(() => {
  return activeUsers.value.map((user) => ({
    label: user.full_name,
    value: user.name,
  }))
})

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

// Stub: Clear all filters
function clearFilters() {
  // TODO: Reset all filters and reload tasks
  console.log('Clear all filters')
  activeFilters.value = {
    status: undefined,
    assigned_to: undefined,
    priority: undefined,
  }
}

// Stub: Add new task
function handleAddTask() {
  if (!newTaskTitle.value.trim()) return

  const title = newTaskTitle.value.trim()
  newTaskTitle.value = ''

  tasks.insert.callOptimistic(
    { title },
    { title, is_completed: 0, status: 'Backlog' },
    { at: 'start' },
  )
}

// Open task edit dialog
function openTaskDialog(task: GPTaskInterface) {
  router.push(`/test/${task.name}`)
}

// Stub: Save task changes
function saveTaskChanges() {
  if (!editingTask.value) return

  // TODO: Implement task update
  console.log('Save task changes:', editingTask.value)

  showTaskDialog.value = false
  editingTask.value = null
}

// Stub: Toggle task completion
function handleToggleComplete(task: GPTaskInterface) {
  tasks.setValue.callOptimistic({
    name: task.name,
    is_completed: task.is_completed ? 0 : 1,
  })
}

// Stub: Delete task
function handleDeleteTask(task: GPTaskInterface) {
  tasks.delete.callOptimistic(task.name)
}

// Stub: Refresh task list
function handleRefresh() {
  // TODO: Implement task list refresh
  console.log('Refresh tasks')
}

// Helper: Format date
function formatDate(dateString: string | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
