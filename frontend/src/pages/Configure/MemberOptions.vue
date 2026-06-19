<template>
  <Dropdown
    :button="{ icon: 'lucide-more-horizontal', size: 'xs', variant: 'ghost' }"
    align="end"
    :label="`${user.full_name} Member Options`"
    :options="options"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { dialog, Dropdown, useDoctype } from 'frappe-ui'
import { communities } from '@/data/communities'
import type { Community, CommunityMember } from '@/data/communities'
import { useUser } from '@/data/users'
import type { GPTeam } from '@/types/doctypes'

const props = defineProps<{
  community: Community
  member: CommunityMember
}>()

const teams = useDoctype<GPTeam>('GP Team')
const user = computed(() => useUser(props.member.user))

const options = computed(() => [
  {
    label: 'Remove from community',
    icon: 'lucide-user-round-minus',
    onClick: removeMember,
    condition: () => !props.community.archived_at,
  },
])

function removeMember() {
  dialog.confirm({
    title: 'Remove member',
    message: `${user.value.full_name} will lose access to private spaces and discussions in this community.`,
    confirmLabel: 'Remove',
    onConfirm: async () => {
      await teams.runDocMethod.submit({
        name: props.community.name,
        method: 'remove_member',
        params: {
          user: props.member.user,
        },
      })
      await communities.reload()
    },
  })
}
</script>
