<template>
  <Dropdown v-if="activeTeams.length > 1" :options="options" side="right" placement="left">
    <template v-slot="{ open }">
      <button
        class="flex h-7 w-full items-center rounded px-2 text-left text-ink-gray-7 transition"
        :class="
          open || isActive
            ? 'bg-surface-selected shadow-sm hover:bg-surface-gray-3'
            : 'hover:bg-surface-gray-2'
        "
      >
        <span class="grid h-5 w-6 place-items-center text-base text-ink-gray-6">
          {{ activeCategory.team?.icon }}
        </span>
        <span class="truncate text-sm text-ink-gray-7">
          {{ activeCategory.team?.title }}
        </span>
        <LucideChevronsUpDown class="ml-auto size-4 text-ink-gray-5" />
      </button>
    </template>

    <template #item="{ item }">
      <ItemListRow>
        <template #prefix>
          {{ item.categoryIcon }}
        </template>
        {{ item.label }}
        <template #suffix>
          <LucideCheck v-if="item.selected" class="size-4 text-ink-gray-5" />
        </template>
      </ItemListRow>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dropdown, ItemListRow } from 'frappe-ui'
import { useRouter } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import LucideCheck from '~icons/lucide/check'
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down'

withDefaults(
  defineProps<{
    isActive?: boolean
  }>(),
  {
    isActive: false,
  },
)

const router = useRouter()

const options = computed(() => {
  return activeTeams.value.map((team) => ({
    label: team.title,
    categoryIcon: team.icon,
    selected: activeCategory.id === team.name,
    onClick: () => changeCategory(team.name),
  }))
})

function changeCategory(teamId: string) {
  if (!teamId || teamId === activeCategory.id) {
    return
  }

  activeCategory.change(teamId)
  router.push({
    name: 'Discussions',
    params: { teamId },
  })
}
</script>
