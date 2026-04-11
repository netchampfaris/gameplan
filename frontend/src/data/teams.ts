import { computed, MaybeRefOrGetter, toValue } from 'vue'
import { GPTeam } from '@/doctypes'
import type { GPTeamInterface } from '@/doctypes'

export type Team = Pick<
  GPTeamInterface,
  'name' | 'title' | 'icon' | 'modified' | 'creation' | 'archived_at' | 'is_private'
>

export let teams = GPTeam.getList({
  fields: ['name', 'title', 'icon', 'modified', 'creation', 'archived_at', 'is_private'],
  orderBy: 'title asc',
  limit: 999,
})

export let activeTeams = computed(() => {
  return (teams.data || []).filter((team) => !team.archived_at)
})

export let useTeam = (teamId: MaybeRefOrGetter<string | undefined>) => {
  return computed(() => {
    let _teamId = toValue(teamId)
    if (!_teamId) {
      return null
    }
    return getTeam(_teamId)
  })
}

export let getTeam = (teamId: string) => {
  return (teams.data || []).find((team) => team.name.toString() === teamId.toString())
}
