<template>
  <PageHeader>
    <Breadcrumbs
      class="h-7"
      :items="[
        { label: 'Drafts', route: { name: 'Drafts' } },
        {
          label: isPersisted ? draftData.title : 'New Discussion',
          route: discussionRoute,
        },
      ]"
    />
    <div class="flex shrink-0 space-x-2">
      <DropdownMoreOptions
        class="hidden sm:block"
        :options="[
          {
            label: 'Delete',
            condition: () => isPersisted && sessionUser.name == author.name,
            onClick: deleteDraft,
          },
          { label: 'Discard', condition: () => !isPersisted, onClick: discard },
          {
            label: 'Save Draft',
            condition: () => isDraftChanged && !saveStatus.isSaving,
            onClick: immediateSave,
          },
        ]"
        align="end"
      />
      <Tooltip text="You cannot publish this draft" :disabled="sessionUser.name == author.name">
        <Button
          variant="solid"
          :loading="publishing"
          @click="publish"
          :disabled="sessionUser.name != author.name"
        >
          Publish
        </Button>
      </Tooltip>
    </div>
  </PageHeader>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Breadcrumbs, Tooltip } from 'frappe-ui'
import PageHeader from '@/components/PageHeader.vue'
import { useNewDiscussionContext } from './useNewDiscussion'
import DropdownMoreOptions from '@/components/DropdownMoreOptions.vue'

const {
  isPersisted,
  draftData,
  sessionUser,
  author,
  deleteDraft,
  discard,
  saveStatus,
  isDraftChanged,
  publish,
  publishing,
  immediateSave,
} = useNewDiscussionContext()

const route = useRoute()
const discussionRoute = computed(() => {
  if (!route.params.communityId) {
    return { name: 'LegacyNewDiscussion' }
  }

  return {
    name: 'NewDiscussion',
    params: { communityId: route.params.communityId },
  }
})
</script>
