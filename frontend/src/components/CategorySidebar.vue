<template>
  <div class="shrink-0 px-3">
    <TooltipProvider>
      <div class="flex flex-col gap-3">
        <div v-for="option in options">
          <TooltipRoot>
            <TooltipTrigger as-child>
              <button class="w-full flex flex-col items-center gap-1" @click="option.onClick">
                <div
                  class="rounded size-7 text-base grid place-content-center"
                  :class="
                    option.selected
                      ? 'bg-surface-gray-5 text-ink-white shadow-sm'
                      : 'text-ink-gray-1'
                  "
                >
                  <span v-if="option.icon?.startsWith('lucide-')" :class="option.icon"></span>
                  <span v-else-if="option.icon">{{ option.icon }}</span>
                  <span v-else>{{ option.label[0] }}</span>
                </div>
                <!-- <div class="text-2xs text-ink-gray-5 break-words">{{ option.label }}</div> -->
              </button>
            </TooltipTrigger>
            <TooltipBubble side="right">
              <template #content>
                <div class="leading-relaxed">
                  {{ option.label }}
                </div>
              </template>
            </TooltipBubble>
          </TooltipRoot>
        </div>
      </div>
    </TooltipProvider>
  </div>
</template>
<script setup lang="ts">
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import { TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { Tooltip, TooltipBubble } from 'frappe-ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const options = computed(() => {
  const isPersonalHome = router.currentRoute.value.name === 'PersonalHome'
  const isSearchPage = router.currentRoute.value.name === 'Search'
  return [
    {
      label: 'Search',
      icon: 'lucide-search',
      selected: isSearchPage,
      onClick: () => {
        activeCategory.change(null)
        router.push({ name: 'Search' })
      },
    },
    {
      label: 'Home',
      icon: 'lucide-home',
      selected: isPersonalHome,
      onClick: () => {
        activeCategory.change(null)
        router.push({ name: 'PersonalHome' })
      },
    },
    ...activeTeams.value.map((team) => ({
      label: team.title,
      icon: team.icon,
      selected: activeCategory.id === team.name && !isPersonalHome && !isSearchPage,
      onClick: () => changeCategory(team.name),
    })),
  ]
})

function changeCategory(teamId: string) {
  router.push({
    name: 'Discussions',
    params: { teamId },
  })
  if (!teamId || teamId === activeCategory.id) {
    return
  }

  activeCategory.change(teamId)
}
</script>
