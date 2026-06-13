import { computed, MaybeRefOrGetter, toValue } from 'vue'
import { useList } from 'frappe-ui'
import { GPTeam, GPMember } from '@/types/doctypes'

interface Member extends Pick<GPMember, 'user'> {}

export interface Team extends Pick<
  GPTeam,
  'name' | 'title' | 'icon' | 'image' | 'modified' | 'creation' | 'archived_at' | 'is_private'
> {
  members: Member[]
}

export let teams = useList<Team>({
  doctype: 'GP Team',
  fields: [
    'name',
    'title',
    'icon',
    'image',
    'modified',
    'creation',
    'archived_at',
    'is_private',
    { members: ['user'] },
  ],
  orderBy: 'title asc',
  initialData: [],
  cacheKey: 'Teams',
  limit: 999,
  transform(data) {
    for (let team of data) {
      team.name = team.name.toString()
    }
    return data
  },
  immediate: true,
})

export let availableTeams = computed(() => {
  return (teams.data || []).filter((team) => !team.archived_at)
})

export let joinedTeams = computed(() => {
  return availableTeams.value.filter(isTeamJoined)
})

export let activeTeams = joinedTeams

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

export let getActiveTeam = (teamId: string) => {
  return activeTeams.value.find((team) => team.name.toString() === teamId.toString())
}

export function isTeamJoined(team: Team) {
  let user = getSessionUserFromCookie()
  return Boolean(user && team.members?.some((member) => member.user === user))
}

function getSessionUserFromCookie() {
  let cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  let user = cookies.get('user_id')
  return user === 'Guest' ? null : user
}
