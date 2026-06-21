<template>
  <div v-if="profile" class="min-h-full bg-surface-base">
    <PageHeader>
      <Breadcrumbs class="h-7" :items="profileBreadcrumbs" />
      <div v-if="isOwnProfile" class="flex shrink-0 items-center gap-2">
        <Button
          v-if="activeTab === 'Profile'"
          icon-left="lucide-layout-dashboard"
          :route="{ name: 'ProfileCustomize' }"
        >
          Customize
        </Button>
        <Button icon-left="lucide-edit" @click="editDialog.show = true"> Edit Profile </Button>
      </div>
    </PageHeader>

    <div class="mx-auto w-full max-w-[860px] px-3 py-4 sm:px-5 sm:py-6">
      <div class="mb-4">
        <TabButtons
          :buttons="[
            { label: 'Profile' },
            { label: 'About' },
            { label: 'Posts' },
            { label: 'Replies' },
          ]"
          v-model="activeTab"
        />
      </div>

      <router-view :profile="profileChildResource" :bento-cards="profileBentoCards" />
    </div>
    <Dialog
      v-if="isOwnProfile"
      title="Edit Profile"
      v-model:open="editDialog.show"
      @after-leave="discard"
    >
      <div class="space-y-4">
        <ProfileImageEditor :profile="profileChildResource" v-if="editDialog.editingProfilePhoto" />
        <template v-else-if="user">
          <div class="flex items-center gap-4">
            <UserAvatar size="lg" :user="profile.user" />
            <Button @click="editDialog.editingProfilePhoto = true"> Edit Profile Photo </Button>
          </div>
          <FormControl label="First Name" v-model="user.first_name" />
          <FormControl label="Last Name" v-model="user.last_name" />
          <FormControl label="Bio" v-model="profile.bio" type="textarea" maxlength="280" />
        </template>
      </div>
      <template #actions>
        <Button
          variant="solid"
          class="w-full"
          @click="save"
          :loading="userResource.setValue.loading || profileResource.setValue.loading"
        >
          Save
        </Button>
      </template>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Breadcrumbs,
  Button,
  Dialog,
  FormControl,
  TabButtons,
  useDoc,
  usePageMeta,
} from 'frappe-ui'
import PageHeader from '@/components/PageHeader.vue'
import ProfileImageEditor from '@/components/ProfileImageEditor.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getProfileBentoCards } from '@/components/ProfileBento/profileBentoSource'
import type { ProfileBentoCard } from '@/components/ProfileBento/types'
import { useSessionUser } from '@/data/users'
import type { GPUserProfile } from '@/types/doctypes'

defineOptions({
  name: 'PersonProfile',
})

const props = defineProps<{
  personId: string
}>()

interface ProfileMethods {
  setImage: (data: { image: string | null }) => void
  removeImageBackground: (data: { default_color?: string | null }) => void
  revertImageBackground: () => void
  isBackgroundRemovalAvailable: () => boolean
}

interface UserDoc {
  name: string
  first_name?: string
  last_name?: string
  full_name?: string
}

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()
const personId = computed(() => {
  return props.personId || route.params.personId?.toString() || 'missing-profile'
})

const editDialog = reactive({ show: false, editingProfilePhoto: false })

const profileResource = useDoc<GPUserProfile, ProfileMethods>({
  doctype: 'GP User Profile',
  name: personId,
  methods: {
    setImage: 'set_image',
    removeImageBackground: 'remove_image_background',
    revertImageBackground: 'revert_image_background',
    isBackgroundRemovalAvailable: 'is_background_removal_available',
  },
})

const profile = computed(() => profileResource.doc)
const profileChildResource = computed(() => ({
  ...profileResource,
  doc: profile.value,
}))
const isOwnProfile = computed(() => profile.value?.user === sessionUser.name)

const userResource = useDoc<UserDoc>({
  doctype: 'User',
  name: sessionUser.name,
  immediate: false,
})

const user = computed(() => (isOwnProfile.value ? userResource.doc : null))
const profileBentoCards = ref<ProfileBentoCard[]>([])
let profileBentoLoadId = 0
let loadedProfileBentoName = ''

const profileBreadcrumbs = computed(() => [
  { label: 'People', route: { name: 'People' } },
  {
    label: profile.value?.full_name || 'Profile',
    route: { name: 'PersonProfileProfile', params: { personId: personId.value } },
    isPageTitle: true,
  },
])

const activeTab = computed({
  get() {
    return (
      {
        PersonProfileProfile: 'Profile',
        PersonProfileAboutMe: 'About',
        PersonProfilePosts: 'Posts',
        PersonProfileReplies: 'Replies',
      }[route.name as string] || 'Profile'
    )
  },
  set(value) {
    let profileRoute = {
      Profile: { name: 'PersonProfileProfile' },
      About: { name: 'PersonProfileAboutMe' },
      Posts: { name: 'PersonProfilePosts' },
      Replies: { name: 'PersonProfileReplies' },
    }[value]
    if (profileRoute) {
      router.push(profileRoute)
    }
  },
})

watch(
  isOwnProfile,
  (ownProfile) => {
    if (ownProfile) {
      userResource.reload()
    }
  },
  { immediate: true },
)

watch(
  () => profile.value?.name,
  () => loadProfileBentoCards(profile.value?.name),
  { immediate: true },
)

async function save() {
  if (!profile.value || !user.value) return

  await userResource.setValue.submit({
    first_name: user.value.first_name,
    last_name: user.value.last_name,
  })
  await profileResource.setValue.submit({
    bio: profile.value.bio,
  })
  editDialog.show = false
  await loadProfileBentoCards(profile.value.name)
}

function discard() {
  userResource.reload()
  profileResource.reload()
  editDialog.show = false
  editDialog.editingProfilePhoto = false
}

async function loadProfileBentoCards(profileName?: string) {
  let loadId = ++profileBentoLoadId
  if (!profileName) {
    loadedProfileBentoName = ''
    profileBentoCards.value = []
    return
  }

  if (profileName !== loadedProfileBentoName) {
    profileBentoCards.value = []
  }

  let cards = await getProfileBentoCards(profileName)
  if (loadId === profileBentoLoadId) {
    loadedProfileBentoName = profileName
    profileBentoCards.value = cards
  }
}

usePageMeta(() => {
  return {
    title: [profile.value?.full_name || '', 'Profile'].join(' | '),
  }
})
</script>
