<template>
  <div class="flex min-h-0 flex-col">
    <h2 class="text-3xl-semibold">Archived Communities</h2>
    <div v-if="archivedTeams.length" class="mt-6 divide-y overflow-y-auto pb-16">
      <div
        v-for="team in archivedTeams"
        :key="team.id"
        class="flex items-center justify-between py-2"
      >
        <div class="flex items-center space-x-2">
          <CommunityImage :community="team" class="size-6 shrink-0 bg-surface-gray-1" />
          <span class="text-base-medium text-ink-gray-8">
            {{ team.title }}
          </span>
        </div>
        <Button
          :loading="
            communities.runDocMethod.loading && communities.runDocMethod.params?.dn === team.name
          "
          @click="
            communities.runDocMethod.submit(
              {
                name: team.name,
                method: 'unarchive',
              },
              {
                onSuccess: () => {
                  communities.reload()
                  $router.push({
                    name: 'Team',
                    params: { teamId: team.name },
                  })
                  show = false
                },
              },
            )
          "
        >
          Unarchive
        </Button>
      </div>
      <ErrorMessage class="pt-2" :message="communities.runDocMethod.error" />
    </div>
    <div v-else class="text-sm text-ink-gray-5">No archived communities</div>
  </div>
</template>
<script>
import { communities } from '@/data/communities'
import CommunityImage from '@/components/CommunityImage.vue'

export default {
  name: 'ArchivedTeamsDialog',
  components: { CommunityImage },
  props: ['modelValue'],
  emits: ['update:modelValue'],
  data() {
    return {
      communities,
    }
  },
  computed: {
    archivedTeams() {
      return communities.data.filter((team) => team.archived_at)
    },
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
  },
}
</script>
