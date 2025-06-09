<template>
  <div class="message-renderer prose prose-sm max-w-none">
    <template v-for="(block, index) in contentBlocks" :key="index">
      <!-- Collapsible XML tag blocks -->
      <div v-if="collapsibleTags.includes(block.type)" class="mb-4">
        <Button @click="toggleBlock(index)">
          <div class="flex items-center gap-1">
            Show
            {{ block.type === 'think' ? 'thinking' : block.type }}
            <LucideChevronDown
              :class="{ 'rotate-180': block.expanded }"
              class="size-4 duration-200"
            />
          </div>
        </Button>

        <div
          v-if="block.expanded"
          class="mt-3 text-ink-gray-7 whitespace-pre-wrap border-l-4 border-outline-gray-1 pl-3"
        >
          {{ block.content }}
        </div>
      </div>

      <!-- Regular content blocks -->
      <div v-else v-html="block.renderedContent"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import showdown from 'showdown'
import { LoadingIndicator } from 'frappe-ui'

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
  expanded?: boolean
  renderedContent?: string
}

// Track expanded state for each block
const expandedBlocks = ref<Set<number>>(new Set())

const toggleBlock = (index: number) => {
  if (expandedBlocks.value.has(index)) {
    expandedBlocks.value.delete(index)
  } else {
    expandedBlocks.value.add(index)
  }
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

    if (nextTagMatch && matchedTag) {
      // A tag was found
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

      // Process the XML tag
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
          expanded: expandedBlocks.value.has(blocks.length),
        })
        currentIndex = closingMatch.index + closingMatch[0].length
      } else {
        // Unclosed tag (streaming)
        const tagContent = content.slice(tagStart)
        blocks.push({
          type: matchedTag,
          content: tagContent.trim(),
          isOpen: true,
          expanded: expandedBlocks.value.has(blocks.length),
        })
        currentIndex = content.length
      }
    } else {
      // No more collapsible tags found from currentIndex
      // No more tags, add remaining content
      const remainingContent = content.slice(currentIndex).trim()
      if (remainingContent) {
        blocks.push({
          type: 'response',
          content: remainingContent,
          renderedContent: converter.makeHtml(remainingContent),
        })
      }
      break // All remaining content is processed, exit loop
    }
  }

  return blocks
})
</script>
