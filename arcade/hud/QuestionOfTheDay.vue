<script setup lang="ts">
import { Button, TextInput, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import AvatarFace from './AvatarFace.vue'
import { MAX_ANSWER_LENGTH, useQuestionOfTheDay } from './useQuestionOfTheDay'

/**
 * The question of the day, at the top of the Notice Board. The player answers in one
 * line, then sees everyone's answers. Until then the server sends only how many people
 * answered, not what they said.
 */

const props = defineProps<{
  user: string
  /** Goes up when someone else changes the board, answering included; the question reloads. */
  revision: number
}>()
const emit = defineEmits<{
  /** The player answered or changed their answer, so the rest of the Room should reload. */
  answered: []
}>()

const question = useQuestionOfTheDay()
watch(
  () => props.revision,
  () => question.reload(),
)

const data = computed(() => question.data.value)
const editing = ref(false)
const draft = ref('')
const showForm = computed(
  () => data.value !== null && (data.value.answer === null || editing.value),
)
const length = computed(() => draft.value.trim().length)
const canSubmit = computed(() => length.value > 0 && length.value <= MAX_ANSWER_LENGTH)

const othersCount = computed(() => {
  const count = data.value?.count ?? 0
  if (!count) return 'Nobody has answered yet.'
  return `${count} ${
    count === 1 ? 'person has' : 'people have'
  } answered. Answer to see what they said.`
})

function edit() {
  draft.value = data.value?.answer ?? ''
  editing.value = true
}

async function submit() {
  if (!canSubmit.value || question.isAnswering.value) return
  try {
    await question.answer(draft.value.trim())
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save your answer')
    return
  }
  draft.value = ''
  editing.value = false
  emit('answered')
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-6 bg-surface-gray-1 p-4"
    aria-label="Question of the day"
  >
    <div>
      <div class="text-sm text-ink-gray-5">Question of the day</div>
      <p v-if="data" class="mt-1.5 text-p-lg-medium text-ink-gray-8">{{ data.question }}</p>
      <p v-else-if="question.error.value" class="mt-1.5 text-p-base text-ink-gray-5">
        {{ question.error.value }}
      </p>
      <p v-else class="mt-1.5 text-p-base text-ink-gray-5">Fetching today's question</p>
    </div>

    <form v-if="showForm" class="flex flex-col gap-2 sm:flex-row" @submit.prevent="submit">
      <TextInput
        v-model="draft"
        class="min-w-0 flex-1"
        placeholder="Your answer"
        aria-label="Your answer"
        :maxlength="MAX_ANSWER_LENGTH"
      />
      <div class="flex gap-2">
        <Button v-if="editing" label="Cancel" @click="editing = false" />
        <Button
          type="submit"
          variant="solid"
          :label="editing ? 'Save' : 'Answer'"
          :disabled="!canSubmit"
          :loading="question.isAnswering.value"
          class="flex-1 sm:flex-none"
        />
      </div>
    </form>

    <p v-if="data && data.answer === null" class="text-p-sm text-ink-gray-5">{{ othersCount }}</p>

    <ul
      v-if="data && data.answer !== null"
      class="-mx-1 flex max-h-44 flex-col gap-1 overflow-y-auto"
    >
      <li
        v-for="entry in data.answers"
        :key="entry.user"
        class="flex items-start gap-2.5 rounded-4 px-1 py-1"
      >
        <AvatarFace :appearance="entry.appearance" :size="24" class="mt-0.5 shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm-medium text-ink-gray-8">
            {{ entry.user === user ? 'You' : entry.fullName }}
          </div>
          <p class="break-words text-p-sm text-ink-gray-7">{{ entry.answer }}</p>
        </div>
        <Button
          v-if="entry.user === user && !editing"
          variant="ghost"
          size="sm"
          label="Edit"
          @click="edit"
        />
      </li>
    </ul>
  </section>
</template>
