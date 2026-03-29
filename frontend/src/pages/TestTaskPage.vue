<template>
  <div class="mx-auto max-w-4xl px-6 py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center gap-3">
      <button
        @click="router.back()"
        class="rounded-md p-1.5 text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-black"
      >
        <LucideArrowLeft class="size-4" />
      </button>
      <div v-if="task.loading" class="text-sm text-ink-gray-5">Loading...</div>
      <div v-else-if="task.error" class="text-sm text-red-600">Error loading task</div>
    </div>

    <!-- Task Details -->
    <div v-if="task.doc" class="space-y-6">
      <!-- Title with checkbox -->
      <div class="flex items-start gap-3">
        <button
          @click="task.setValue.call({ is_completed: task.doc.is_completed ? 0 : 1 })"
          class="mt-1 flex-shrink-0"
        >
          <div
            v-if="task.doc.is_completed"
            class="flex size-5 items-center justify-center rounded-full bg-surface-black"
          >
            <LucideCheck class="size-3.5 text-ink-white" />
          </div>
          <div
            v-else
            class="size-5 rounded-full border border-outline-gray-3 transition-colors hover:border-outline-gray-4"
          />
        </button>
        <input
          :value="task.doc.title"
          @blur="handleTitleUpdate"
          @keyup.enter="(e) => (e.target as HTMLInputElement).blur()"
          :class="[
            'flex-1 border-none bg-transparent text-2xl font-medium outline-none',
            task.doc.is_completed ? 'text-ink-gray-5 line-through' : 'text-ink-black',
          ]"
        />
      </div>

      <!-- Metadata -->
      <div class="flex flex-wrap items-center gap-4 border-b border-outline-gray-2 pb-4">
        <Combobox
          v-model="task.doc.assigned_to"
          @update:model-value="task.setValue.call({ assigned_to: task.doc.assigned_to })"
          :options="assigneeOptions"
          placeholder="Assign to"
          variant="ghost"
        >
          <template #prefix>
            <LucideUser class="size-3.5 text-ink-gray-5" />
          </template>
        </Combobox>

        <Select
          v-model="task.doc.status"
          :options="statusOptions"
          placeholder="Status"
          variant="ghost"
        >
          <template #prefix>
            <LucideCircleDot class="size-3.5 text-ink-gray-5" />
          </template>
        </Select>

        <Select
          v-model="task.doc.priority"
          :options="priorityOptions"
          placeholder="Priority"
          variant="ghost"
        >
          <template #prefix>
            <LucideSignal class="size-3.5 text-ink-gray-5" />
          </template>
        </Select>

        <DatePicker v-model="task.doc.due_date" placeholder="Due date" format="D MMM, YYYY" />
      </div>

      <!-- Description -->
      <div>
        <label class="mb-2 block text-sm font-medium text-ink-gray-9">Description</label>
        <TextEditor
          :content="task.doc.description"
          @change="handleDescriptionUpdate"
          :editable="true"
          :placeholder="'Add description...'"
          editor-class="min-h-[200px] prose-sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { GPTask as Task } from '@/doctypes'
import { Combobox, Select, DatePicker } from 'frappe-ui'
import { activeUsers } from '@/data/users'
import TextEditor from '@/components/TextEditor.vue'

const props = defineProps<{
  taskId: string
}>()

const router = useRouter()

const task = Task.getDoc(() => props.taskId)

// task.doc?.title

// task.trackVisit.call()
// task.trackVisit()
// task.trackVisit.loading
// task.trackVisit.error
// task.trackVisit.data

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

// Stub: Toggle completion
function handleToggleComplete() {
  // TODO: Implement toggle completion
  console.log('Toggle completion for task:', props.taskId)
}

// Stub: Update title
function handleTitleUpdate(e: FocusEvent) {
  const newTitle = (e.target as HTMLInputElement).value
  if (!task.doc || newTitle === task.doc.title || !newTitle.trim()) return

  // TODO: Implement title update
  console.log('Update title to:', newTitle)
  task.setValue.call({
    title: newTitle.trim(),
  })
}

// Stub: Update description
function handleDescriptionUpdate(val: string) {
  // TODO: Implement description update
  console.log('Update description to:', val)
}
</script>
