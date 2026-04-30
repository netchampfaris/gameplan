<template>
  <Combobox
    :options="categoryOptions"
    :model-value="activeCategory.id"
    placeholder="Search categories"
    side="right"
    align="start"
    @update:selectedOption="onSelect"
  >
    <template #trigger="{ open }">
      <slot :open="open" />
    </template>

    <!-- Each row's leading slot: render the team's emoji/icon if present, else first letter as a tile fallback. -->
    <template #item-prefix="{ item }">
      <span
        v-if="item.icon"
        class="inline-flex size-5 shrink-0 items-center justify-center text-base leading-none"
        aria-hidden="true"
      >
        {{ item.icon }}
      </span>
      <span
        v-else
        class="inline-flex size-5 shrink-0 items-center justify-center rounded bg-surface-gray-2 text-xs font-medium uppercase text-ink-gray-7"
        aria-hidden="true"
      >
        {{ item.label?.[0] }}
      </span>
    </template>

    <template #item-suffix="{ selected }">
      <LucideCheck v-if="selected" class="size-4 text-ink-gray-5" />
    </template>
  </Combobox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Combobox } from 'frappe-ui'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import LucideCheck from '~icons/lucide/check'

const router = useRouter()

const categoryOptions = computed(() => {
  return activeTeams.value.map((team) => ({
    label: team.title,
    value: team.name,
    icon: team.icon,
  }))
})

function onSelect(option: { value: string } | null) {
  if (!option || option.value === activeCategory.id) return

  activeCategory.change(option.value)
  router.push({ name: 'Discussions', params: { teamId: option.value } })
}
</script>
