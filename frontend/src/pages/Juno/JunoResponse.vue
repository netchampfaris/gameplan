<template>
  <div class="message-renderer prose prose-sm max-w-none">
    <template v-for="(block, index) in contentBlocks" :key="index">
      <!-- Collapsible XML tag blocks -->
      <details
        v-if="collapsibleTags.includes(block.type)"
        class="xml-tag-details border border-gray-200 rounded-lg p-3 my-2 bg-gray-50"
        :class="{
          'border-orange-200 bg-orange-50': block.isOpen,
        }"
      >
        <summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
          <span class="inline-flex items-center gap-2">
            <svg
              class="w-4 h-4 transform transition-transform details-chevron"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
            {{ block.type.charAt(0).toUpperCase() + block.type.slice(1) }}
            <span
              v-if="block.isOpen"
              class="inline-flex items-center gap-1 text-xs text-orange-600 font-medium"
            >
              <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              Processing...
            </span>
          </span>
        </summary>
        <div class="mt-3 pl-6 text-gray-600 whitespace-pre-wrap border-l-2 border-gray-300">
          {{ block.content }}
        </div>
      </details>

      <!-- Regular content blocks -->
      <div v-else v-html="block.renderedContent"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import showdown from 'showdown'

interface Props {
  content: string
}

const props = defineProps<Props>()

// Configure showdown converter
const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  tasklists: true,
  ghCodeBlocks: true,
  smoothLivePreview: true,
  openLinksInNewWindow: true,
  emoji: true,
})

// List of XML tags to render as collapsible details
const collapsibleTags = ['think', 'reasoning', 'analysis', 'planning', 'internal', 'debug']

interface ContentBlock {
  type: string
  content: string
  isOpen?: boolean
  renderedContent?: string
}

const contentBlocks = computed((): ContentBlock[] => {
  const blocks: ContentBlock[] = []
  let content = props.content
  let currentIndex = 0

  while (currentIndex < content.length) {
    // Find the next XML tag
    let nextTagMatch: RegExpMatchArray | null = null
    let nextTagIndex = content.length
    let matchedTag = ''

    // Look for the earliest occurring collapsible tag
    for (const tagName of collapsibleTags) {
      const regex = new RegExp(`<${tagName}>`, 'gi')
      regex.lastIndex = currentIndex
      const match = regex.exec(content)
      if (match && match.index < nextTagIndex) {
        nextTagMatch = match
        nextTagIndex = match.index
        matchedTag = tagName
      }
    }

    // Add content before the tag as a regular block
    if (nextTagIndex > currentIndex) {
      const beforeContent = content.slice(currentIndex, nextTagIndex).trim()
      if (beforeContent) {
        blocks.push({
          type: 'response',
          content: beforeContent,
          renderedContent: converter.makeHtml(beforeContent),
        })
      }
    }

    // Process the XML tag if found
    if (nextTagMatch && matchedTag) {
      const tagStart = nextTagIndex + nextTagMatch[0].length

      // Look for closing tag
      const closingTagRegex = new RegExp(`</${matchedTag}>`, 'gi')
      closingTagRegex.lastIndex = tagStart
      const closingMatch = closingTagRegex.exec(content)

      if (closingMatch) {
        // Closed tag
        const tagContent = content.slice(tagStart, closingMatch.index)
        blocks.push({
          type: matchedTag,
          content: tagContent.trim(),
          isOpen: false,
        })
        currentIndex = closingMatch.index + closingMatch[0].length
      } else {
        // Unclosed tag (streaming)
        const tagContent = content.slice(tagStart)
        blocks.push({
          type: matchedTag,
          content: tagContent.trim(),
          isOpen: true,
        })
        currentIndex = content.length
      }
    } else {
      // No more tags, add remaining content
      const remainingContent = content.slice(currentIndex).trim()
      if (remainingContent) {
        blocks.push({
          type: 'response',
          content: remainingContent,
          renderedContent: converter.makeHtml(remainingContent),
        })
      }
      break
    }
  }

  return blocks
})
</script>

<style scoped>
/* Custom styles for XML tag details */
.message-renderer :deep(.xml-tag-details) {
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  background-color: rgb(249 250 251);
}

.message-renderer :deep(.xml-tag-details.border-orange-200) {
  border-color: rgb(254 215 170);
  background-color: rgb(255 247 237);
}

.message-renderer :deep(.xml-tag-details summary) {
  cursor: pointer;
  font-weight: 500;
  color: rgb(55 65 81);
  user-select: none;
}

.message-renderer :deep(.xml-tag-details summary:hover) {
  color: rgb(17 24 39);
}

.message-renderer :deep(.xml-tag-details[open] .details-chevron) {
  transform: rotate(90deg);
}

.message-renderer :deep(.xml-tag-details .details-chevron) {
  transition: transform 0.2s ease;
}

.message-renderer :deep(.xml-tag-details summary::-webkit-details-marker) {
  display: none;
}

.message-renderer :deep(.xml-tag-details summary::-moz-list-bullet) {
  list-style-type: none;
}
</style>
