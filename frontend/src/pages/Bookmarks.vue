<template>
  <PageHeader>
    <Breadcrumbs class="h-7" :items="[{ label: 'Bookmarks', route: { name: 'Bookmarks' } }]" />
  </PageHeader>
  <div class="body-container pt-5 pb-40">
    <DiscussionList
      class="-mx-3"
      :filters="{ feed_type: 'bookmarks' }"
      :show-pinned="false"
      cacheKey="Bookmarks"
    />
  </div>
</template>

<script setup lang="ts">
import { Breadcrumbs, usePageMeta } from 'frappe-ui'
import DiscussionList from '@/components/DiscussionList.vue'
import PageHeader from '@/components/PageHeader.vue'

usePageMeta(() => ({ title: 'Bookmarks' }))
</script>
