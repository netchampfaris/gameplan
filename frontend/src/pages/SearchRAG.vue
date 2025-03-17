<template>
  <div>
    <div>
      <header class="sticky top-0 z-10 border-b bg-surface-white px-4 py-2.5 sm:px-5">
        <div class="flex items-center justify-between">
          <Breadcrumbs :items="[{ label: 'AI Search', route: { name: 'SearchRAG' } }]" />
        </div>
      </header>
      <div class="mx-auto mt-6 max-w-4xl px-4 sm:px-5">
        <!-- Search Input -->
        <div class="flex items-center space-x-2 px-2.5">
          <TextInput
            class="flex-1"
            placeholder="Search with AI"
            autocomplete="off"
            :model-value="query"
            @update:model-value="updateQuery"
            @keydown.enter="submit"
          >
            <template #prefix>
              <LucideSearch class="w-4 text-ink-gray-5" />
            </template>
            <template #suffix>
              <div class="flex items-center">
                <button
                  v-if="query"
                  @click="clearSearch"
                  class="p-1 size-6 grid place-content-center focus:outline-none focus:ring focus:ring-outline-gray-3 rounded"
                >
                  <LucideX class="w-4 text-ink-gray-7" />
                </button>
              </div>
            </template>
          </TextInput>
          <div>
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <input
                type="checkbox"
                id="generate-answer"
                v-model="generateAnswer"
                class="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-offset-0"
              />
              <label for="generate-answer" class="text-sm">Generate Answer</label>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="search.loading" class="mt-4 text-center text-ink-gray-6">
          <p>Searching...</p>
        </div>

        <!-- Error Message -->
        <div v-else-if="search.error || searchResponse?.error" class="mt-4">
          <ErrorMessage :message="search.error || searchResponse?.error || 'An error occurred'" />
        </div>

        <!-- AI Answer Section -->
        <div v-else-if="searchResponse?.answer && generateAnswer" class="mt-5 px-2.5">
          <div class="rounded-lg border border-surface-gray-3 bg-surface-gray-1 p-4">
            <div class="flex items-center gap-2 mb-2">
              <LucideBot class="size-5 text-primary" />
              <h3 class="font-medium">AI Answer</h3>
            </div>
            <div
              class="prose prose-sm max-w-none prose-p:leading-normal prose-headings:font-semibold"
            >
              {{ searchResponse.answer }}
            </div>
          </div>
        </div>

        <!-- Results Section -->
        <div class="mt-5" v-if="searchResponse?.results?.length">
          <template v-for="item in searchResponse.results" :key="item.id">
            <div class="flex space-x-2 overflow-hidden rounded px-2.5 py-3 hover:bg-surface-gray-2">
              <div>
                <UserAvatarWithHover :user="item.owner" />
              </div>
              <div class="w-full">
                <div class="flex items-center">
                  <div class="text-base font-medium" v-if="item.doctype === 'GP Discussion'">
                    {{ getTitle(item) }}
                  </div>
                  <div class="text-base font-medium" v-else-if="item.doctype === 'GP Comment'">
                    {{ getCommentTitle(item) }}
                  </div>
                  <div class="text-base font-medium" v-else>
                    {{ getTitle(item) || $user(item.owner).full_name }}
                  </div>
                  <span class="px-1 leading-none text-sm text-ink-gray-5">
                    &middot; {{ item.doctype.replace('GP ', '') }}
                  </span>
                </div>
                <div v-if="item.content" class="mt-1 text-p-base text-ink-gray-6 line-clamp-3">
                  {{ item.content }}
                </div>
              </div>
            </div>
            <div class="border-b mx-2"></div>
          </template>
        </div>

        <!-- No Results Message -->
        <div
          v-else-if="query && !search.loading && searchResponse"
          class="mt-4 text-center text-ink-gray-6"
        >
          <p>No results found</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Breadcrumbs, TextInput, usePageMeta } from 'frappe-ui'
import { useCall } from 'frappe-ui/src/data-fetching'
import LucideSearch from '~icons/lucide/search'
import LucideX from '~icons/lucide/x'
import LucideBot from '~icons/lucide/bot'
import UserAvatarWithHover from '@/components/UserAvatarWithHover.vue'

interface SearchResultItem {
  id: string
  content: string
  doctype: string
  name: string
  project: string
  owner: string
  score: number
  reference_doctype?: string
  reference_name?: string
}

interface SearchResponse {
  results: SearchResultItem[]
  summary: {
    total_matches: number
    filtered_matches: number
  }
  answer?: string
  error?: string
}

const query = ref('')
const generateAnswer = ref(false)
const searchResponse = ref<SearchResponse | null>(null)
const router = useRouter()
const route = useRoute()

// Initialize from route query params
onMounted(() => {
  const searchQuery = route.query.q as string
  const answerParam = route.query.answer

  if (searchQuery) {
    query.value = searchQuery
    generateAnswer.value = answerParam === 'true'
    submit()
  }
})

// Search API call
const search = useCall<SearchResponse>({
  url: '/api/v2/method/gameplan.rag.search',
  immediate: false,
  onSuccess(response) {
    console.log(response)
    searchResponse.value = response
  },
})

// Clear search
function clearSearch() {
  query.value = ''
  searchResponse.value = null
  router.replace({ query: {} })
}

// Update URL when query changes
function updateQuery(value: string) {
  query.value = value
}

// Submit search
function submit() {
  if (!query.value.trim()) return

  router.replace({
    query: {
      q: query.value,
      answer: generateAnswer.value.toString(),
    },
  })

  search.submit({
    query: query.value,
    generate_answer: generateAnswer.value,
    top_k: 10,
  })
}

// Watch for generate answer changes to update URL
watch(generateAnswer, () => {
  if (query.value) {
    router.replace({
      query: {
        q: query.value,
        answer: generateAnswer.value.toString(),
      },
    })
  }
})

// Page metadata
usePageMeta(() => {
  return {
    title: 'AI Search',
  }
})

// Helper functions for display
function getTitle(item: SearchResultItem) {
  const firstLine = item.content?.split('\n')[0]
  return firstLine?.substring(0, 60) || 'Unnamed document'
}

function getCommentTitle(item: SearchResultItem) {
  const refType = item.reference_doctype?.replace('GP ', '') || 'Comment'
  return `Comment on ${refType}`
}

function getItemRoute(item: SearchResultItem) {
  switch (item.doctype) {
    case 'GP Discussion':
      return {
        name: 'Discussion',
        params: {
          spaceId: item.project,
          postId: item.name,
        },
      }
    case 'GP Task':
      return {
        name: 'SpaceTask',
        params: {
          spaceId: item.project,
          taskId: item.name,
        },
      }
    case 'GP Page':
      return {
        name: 'SpacePage',
        params: {
          spaceId: item.project,
          pageId: item.name,
        },
      }
    case 'GP Comment':
      if (item.reference_doctype === 'GP Discussion') {
        return {
          name: 'Discussion',
          params: {
            spaceId: item.project,
            postId: item.reference_name,
          },
          query: { comment: item.name },
        }
      }
      if (item.reference_doctype === 'GP Task') {
        return {
          name: 'SpaceTask',
          params: {
            spaceId: item.project,
            taskId: item.reference_name,
          },
          query: { comment: item.name },
        }
      }
      return {}
    default:
      return {}
  }
}
</script>
