<template>
  <PageHeader>
    <Breadcrumbs :items="[{ label: 'Home' }]" />
  </PageHeader>
  <div class="mt-5 body-container">
    <TabButtons
      :buttons="[
        {
          label: 'Drafts',
          iconLeft: LucidePencilLine,
        },
        {
          label: 'Tasks',
          iconLeft: LucideTodoList,
        },
        {
          label: 'Pages',
          iconLeft: LucideFiles,
        },
        {
          label: 'Bookmarks',
          iconLeft: LucideBookmark,
        },
      ]"
    />
  </div>
</template>
<script setup lang="ts">
import { Breadcrumbs, TabButtons } from 'frappe-ui'
import LucidePencilLine from '~icons/lucide/pencil-line'
import LucideTodoList from '~icons/lucide/list-todo'
import LucideFiles from '~icons/lucide/files'
import LucideBookmark from '~icons/lucide/bookmark'
import PageHeader from '@/components/PageHeader.vue'
</script>
