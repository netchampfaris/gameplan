<template>
  <header class="sticky top-0 z-10 border-b bg-white px-4 py-2.5 sm:px-5">
    <div class="flex items-center justify-between">
      <Breadcrumbs :items="[{ label: 'Search', route: { name: 'Search' } }]" />
    </div>
  </header>
  <div class="mx-auto mt-6 max-w-4xl px-4 sm:px-5">
    <div class="flex items-center space-x-2">
      <TextInput
        class="w-full"
        placeholder="Type a keyword and hit enter to search"
        autocomplete="off"
        v-model="query"
        @keydown.enter="(e) => search(e.target.value)"
      >
        <template>
          <LucideSearch class="w-4 text-gray-600" />
        </template>
      </TextInput>
      <Button @click="search(query)" :loading="$resources.search.loading">
        Search
      </Button>
    </div>
    <div
      v-if="$resources.search.params && $resources.search.data?.results"
      class="mt-4 text-base font-semibold text-gray-800"
    >
      Search results for "{{ $resources.search.params?.query }}" in
      {{ $resources.search.data.duration.toFixed(2) }} s
    </div>
    <div
      class="pb-10"
      v-if="$resources.search.params && $resources.search.data?.results"
    >
      <!-- <pre v-for="item in $resources.search.data.results" :key="item.name">
      {{ getRoute(item) }}
      </pre> -->
      <router-link
        v-for="item in $resources.search.data.results"
        :key="item.name"
        :to="getRoute(item)"
        class="block overflow-hidden rounded px-2.5 py-3 hover:bg-gray-100"
      >
        <div class="flex items-center">
          <div v-if="item.title" class="flex items-center">
            <div class="text-base font-medium" v-html="item.title" />
            <span class="px-1 leading-none text-gray-600"> &middot; </span>
          </div>
          <!-- <div class="text-base" v-else-if="item.comment">Comment</div> -->
          <div class="text-sm text-gray-600">{{ itemDescription(item) }}</div>
          <div class="ml-auto text-sm text-gray-600">
            {{ timestamp(item) }}
          </div>
        </div>
        <div
          v-if="item.content"
          class="mt-1 text-p-base text-gray-700"
          v-html="trimContent(item.content)"
        ></div>
      </router-link>
    </div>
  </div>
</template>
<script>
import { Breadcrumbs, TextInput } from 'frappe-ui'

export default {
  name: 'AppSearch',
  data() {
    return {
      query: '',
    }
  },
  mounted() {
    this.query = this.$route.query.q || ''
    this.search(this.query)
    this.$router.replace({ query: null })
  },
  resources: {
    search: {
      url: 'gameplan.api.search2',
      makeParams(query) {
        return { query, start: this.start }
      },
      __transform(data) {
        let out = {
          groups: [],
          total: data.total,
          duration: data.duration,
        }
        for (let doctype in data.results) {
          let group = null
          if (doctype === 'GP Discussion') {
            group = 'Discussions'
          } else if (doctype === 'GP Task') {
            group = 'Tasks'
          } else if (doctype === 'GP Page') {
            group = 'Pages'
          }
          if (!group) {
            continue
          }
          out.groups.push({
            title: group,
            items: data.results[doctype],
          })
        }
        return out
      },
    },
  },
  methods: {
    search(value) {
      if (value) {
        this.$resources.search.submit(value)
      }
    },
    trimContent(content) {
      let trimmedLength = 200
      let indexOf = content.indexOf('<mark>')
      if (indexOf === -1) {
        return content.slice(0, 200)
      }
      let start = indexOf - trimmedLength / 2
      if (start < 0) {
        start = 0
      }
      let end = indexOf + trimmedLength / 2
      if (end > content.length) {
        end = content.length
      }
      return content.slice(start, end)
    },
    timestamp(d) {
      let timestamp = d.last_updated
      if (this.$dayjs().diff(timestamp, 'day') < 25) {
        return this.$dayjs(timestamp).fromNow()
      }
      return this.$dayjs(timestamp).format('D MMM YYYY')
    },
    itemDescription(item) {
      if (item.comment) {
        return 'Comment'
      }
      if (item.discussion) {
        return 'Discussion'
      }
      if (item.task) {
        return 'Task'
      }
      if (item.page) {
        return 'Page'
      }
      return 'Unknown'
    },
    getRoute(item) {
      if (item.discussion) {
        return {
          name: 'ProjectDiscussion',
          params: {
            teamId: item.team,
            projectId: item.project,
            postId: item.discussion,
          },
          query: { comment: item.comment },
        }
      }
      if (item.task) {
        return {
          name: item.project ? 'ProjectTaskDetail' : 'Task',
          params: {
            teamId: item.team,
            projectId: item.project,
            taskId: item.task,
          },
        }
      }
      if (item.page) {
        return {
          name: 'ProjectPage',
          params: {
            teamId: item.team,
            projectId: item.project,
            pageId: item.page,
          },
        }
      }
      return { name: 'Search' }
    },
  },
  pageMeta() {
    return {
      title: 'Search',
      emoji: '🔍',
    }
  },
  components: { TextInput, Breadcrumbs },
}
</script>
<style>
.search-result mark {
  border-radius: 0.25rem;
  background-color: theme('colors.yellow.200');
  padding: 2px 3px;
}
</style>
