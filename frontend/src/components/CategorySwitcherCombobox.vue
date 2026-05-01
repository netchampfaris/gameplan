<template>
  <Combobox
    :options="categoryOptions"
    :model-value="activeCategory.id"
    placeholder="Search categories"
    align="start"
    @update:selectedOption="onSelect"
  >
    <template #trigger="{ open }">
      <slot :open="open" />
    </template>

    <!-- Each row's leading slot: image if uploaded, else emoji icon, else first letter as a tile fallback. -->
    <template #item-prefix="{ item }">
      <img
        v-if="item.image"
        :src="item.image"
        :alt="item.label"
        class="size-6 shrink-0 rounded-sm object-cover"
      />
      <span
        v-else-if="item.icon"
        class="inline-flex size-6 shrink-0 items-center justify-center text-base leading-none bg-surface-gray-1"
        aria-hidden="true"
      >
        {{ item.icon }}
      </span>
      <span
        v-else
        class="inline-flex size-6 shrink-0 items-center justify-center rounded text-xs font-medium uppercase text-ink-gray-7 bg-surface-gray-1"
        aria-hidden="true"
      >
        {{ item.label?.[0] }}
      </span>
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
    image: team.image,
  }))
})

function onSelect(option: { value: string } | null) {
  if (!option || option.value === activeCategory.id) return

  activeCategory.change(option.value)
  router.push({ name: 'Discussions', params: { teamId: option.value } })
}
</script>
