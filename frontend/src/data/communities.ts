import { computed, MaybeRefOrGetter, toValue } from 'vue'
import { useList } from 'frappe-ui'
import { GPTeam, GPMember } from '@/types/doctypes'

export interface CommunityMember extends Pick<GPMember, 'user'> {
  user: string
}

export interface Community extends Pick<
  GPTeam,
  'name' | 'title' | 'icon' | 'image' | 'modified' | 'creation' | 'archived_at' | 'is_private'
> {
  members: CommunityMember[]
}

export let communities = useList<Community>({
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
  cacheKey: 'Communities',
  limit: 999,
  transform(data) {
    for (let community of data) {
      community.name = community.name.toString()
    }
    return data
  },
  immediate: true,
})

export let availableCommunities = computed(() => {
  return (communities.data || []).filter((community) => !community.archived_at)
})

export let joinedCommunities = computed(() => {
  return availableCommunities.value.filter(isCommunityJoined)
})

export let activeCommunities = joinedCommunities

export let useCommunity = (communityId: MaybeRefOrGetter<string | undefined>) => {
  return computed(() => {
    let _communityId = toValue(communityId)
    if (!_communityId) {
      return null
    }
    return getCommunity(_communityId)
  })
}

export let getCommunity = (communityId: string) => {
  return (communities.data || []).find(
    (community) => community.name.toString() === communityId.toString(),
  )
}

export let getActiveCommunity = (communityId: string) => {
  return activeCommunities.value.find(
    (community) => community.name.toString() === communityId.toString(),
  )
}

export function isCommunityJoined(community: Community) {
  let user = getSessionUserFromCookie()
  return Boolean(user && community.members?.some((member) => member.user === user))
}

function getSessionUserFromCookie() {
  let cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  let user = cookies.get('user_id')
  return user === 'Guest' ? null : user
}
