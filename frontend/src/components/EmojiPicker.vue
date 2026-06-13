<template>
  <Popover transition="default">
    <template #target="{ togglePopover, isOpen }">
      <button type="button" @click="togglePopover()">
        <slot v-bind="{ isOpen }">
          <span class="text-base"> {{ modelValue || '' }} </span>
        </slot>
      </button>
    </template>
    <template #body>
      <div class="left-1/2 mt-3 max-w-max -translate-x-1/2 transform px-4 sm:px-0">
        <div
          class="relative max-h-96 overflow-y-auto rounded-lg bg-surface-elevation-2 pb-3 shadow-2xl ring-1 ring-black ring-opacity-5"
        >
          <div class="flex gap-2 px-3 pb-1 pt-3">
            <div class="flex-1">
              <FormControl
                v-model="search"
                type="text"
                placeholder="Search by keyword"
                :debounce="300"
              />
            </div>
            <Button @click="setRandom">Random</Button>
          </div>
          <div class="w-96"></div>
          <div v-for="(emojis, group) in emojiGroups" :key="group" class="px-3">
            <div class="sticky top-0 bg-surface-elevation-2 pb-2 pt-3 text-sm text-ink-gray-6">
              {{ group }}
            </div>
            <div class="grid w-96 grid-cols-12 place-items-center">
              <button
                v-for="emoji in emojis"
                :key="emoji.description"
                type="button"
                class="h-8 w-8 rounded-md p-1 text-4xl hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                :title="emoji.description"
                @click="$emit('update:modelValue', emoji.emoji)"
              >
                {{ emoji.emoji }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Popover>
</template>

<script>
import { Popover } from 'frappe-ui'
import { gemoji } from 'gemoji'

export default {
  name: 'EmojiPicker',
  props: ['modelValue', 'setDefault'],
  emits: ['update:modelValue'],
  expose: ['setRandom'],
  components: {
    Popover,
  },
  data() {
    return { search: '' }
  },
  computed: {
    emojiGroups() {
      let groups = {}
      for (let emoji of gemoji) {
        if (this.search) {
          let keywords = [emoji.description, ...emoji.names, ...emoji.tags].join(' ').toLowerCase()
          if (!keywords.includes(this.search.toLowerCase())) {
            continue
          }
        }

        let group = groups[emoji.category]
        if (!group) {
          groups[emoji.category] = []
          group = groups[emoji.category]
        }
        group.push(emoji)
      }
      if (!Object.keys(groups).length) {
        groups['No results'] = []
      }
      return groups
    },
  },
  mounted() {
    if (this.setDefault && !this.modelValue) {
      this.setRandom()
    }
  },
  methods: {
    setRandom() {
      let total = gemoji.length
      let index = randomInt(0, total - 1)
      this.$emit('update:modelValue', gemoji[index].emoji)
    },
  },
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
</script>
