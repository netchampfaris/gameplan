<template>
  <div class="relative flex h-full flex-col" v-if="users.isFinished">
    <div class="h-full flex-1 standalone:border-t">
      <div class="flex h-full">
        <AppRail />
        <AppSidebar v-if="onCommunityRoute" />
        <div class="flex min-w-0 flex-1 py-1 pr-1">
          <div class="flex min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-base shadow-sm">
            <div class="flex flex-1 min-w-0 flex-col">
              <div id="pageHeaderTarget" />
              <ScrollContainer>
                <div
                  v-if="$readOnlyMode"
                  class="right-0 top-0 mb-3 bg-surface-gray-2 py-3 text-sm text-ink-gray-5"
                >
                  <div class="mx-auto px-10">
                    This site is running in read-only mode. Full functionality will be restored
                    soon.
                  </div>
                </div>
                <slot />
              </ScrollContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
    <CommandPalette />
    <SettingsDialog />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScrollContainer from './ScrollContainer.vue'
import AppRail from './AppRail.vue'
import AppSidebar from './AppSidebar.vue'
import CommandPalette from './CommandPalette/CommandPalette.vue'
import SettingsDialog from './Settings/SettingsDialog.vue'
import { users } from '@/data/users'

const route = useRoute()

const onCommunityRoute = computed(() => {
  return route.matched.some((record) => record.meta?.communityScope)
})
</script>
