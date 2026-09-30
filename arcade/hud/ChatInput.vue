<script setup lang="ts">
import { KeyboardShortcut, TextInput } from 'frappe-ui'
import { ref, useTemplateRef } from 'vue'
import { MAX_SAY_LENGTH } from '../net/protocol'

/**
 * Says something to the Room. Enter from the game focuses it (see `Arcade.vue`), Enter
 * sends and hands the keyboard back, and Esc leaves without sending.
 */

const emit = defineEmits<{ send: [text: string]; focus: []; blur: [] }>()

const input = useTemplateRef<InstanceType<typeof TextInput>>('input')
const text = ref('')
const focused = ref(false)

function send() {
  const message = text.value.trim()
  if (message) emit('send', message)
  text.value = ''
  input.value?.inputElement?.blur()
}

function onKeydown(event: KeyboardEvent) {
  // Enter while composing (IME) confirms the composition, not the message.
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    send()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    input.value?.inputElement?.blur()
  }
}

function onFocus() {
  focused.value = true
  emit('focus')
}

function onBlur() {
  focused.value = false
  emit('blur')
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <TextInput
    ref="input"
    v-model="text"
    class="w-full sm:w-72"
    placeholder="Say something"
    :maxlength="MAX_SAY_LENGTH"
    aria-label="Say something to the Room"
    autocomplete="off"
    enterkeyhint="send"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
  >
    <template #suffix>
      <KeyboardShortcut v-if="!focused" combo="Enter" bg />
    </template>
  </TextInput>
</template>
