<template>
  <div class="mx-auto max-w-4xl py-4">
    <div v-if="false">
      <div class="flex space-x-2">
        <TextInput v-model="query" placeholder="Search" />
        <Button @click="profiles.execute()" :loading="profiles.loading">Reload</Button>
      </div>

      <div class="flex space-x-2">
        <Button
          v-if="profiles.hasPreviousPage"
          @click="profiles.previous()"
          :loading="profiles.loading"
        >
          Prev
        </Button>
        <span>{{ profiles.start }}</span>
        <Button v-if="profiles.hasNextPage" @click="profiles.next()" :loading="profiles.loading">
          Next
        </Button>
      </div>
      <div class="text-wrap my-4 break-words max-w-4xl font-mono">
        {{ decodeURIComponent(profiles.url) }}
      </div>
      <pre class="text-xs">{{ profiles.data }}</pre>
    </div>
    <div class="mt-4">
      <!-- <TextInput
        v-model="query"
        placeholder="Search"
        @update:modelValue="search.submit({ query: query })"
      />
      <pre>{{ search }}</pre> -->
    </div>
    <div v-if="false">
      <TextInput
        v-model="query"
        placeholder="Search"
        @keydown.enter="pages.insert.submit({ title: query, content: query })"
      />
      <!-- <Button @click="profiles.execute()" :loading="profiles.loading">Reload</Button> -->

      <pre>{{ pages.data }}</pre>
    </div>
    <div>
      <pre>{{ testCall }}</pre>
    </div>
  </div>
</template>
<script setup lang="ts">
// import { spaces } from '@/data/spaces'
import { GPPage, GPUserProfile } from '@/types/doctypes'
import { ListFilters, useList } from 'frappe-ui/src/data-fetching/useList'
import { useCall } from 'frappe-ui/src/data-fetching/useCall'
import { useFetch } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'

const query = ref('far')
const filters = reactive({
  full_name: ['like', query],
})

let profiles = useList<GPUserProfile>({
  doctype: 'GP User Profile',
  fields: ['user', 'full_name', 'bio', 'name'],
  filters,
})

let pages = useList<GPPage>({
  doctype: 'GP Page',
  fields: ['name', 'title'],
  orderBy: 'creation desc',
})

// let queryParams = reactive({})
// let url = computed(() => '/api/v2/method/test' + '?' + new URLSearchParams(queryParams).toString())
// let testFetch = useFetch(url, { refetch: true })

let testCall = useCall({
  url: '/api/v2/method/test',
  method: 'POST',
  immediate: false,
  //   refetch: true,
})

// testCall.submit({ test: 'test' })
// console.log(testCall.promise)

// testCall.promise.then(() => {
//   console.log(testCall.data)
// })

window.testCall = testCall

// let search = useCall({
//   url: '/api/v2/method/gameplan.api.search',
// })

// console.log(spaces.loading)

// setTimeout(() => {
//   spaces.data = []
// }, 2000)
// spaces.data =
</script>
