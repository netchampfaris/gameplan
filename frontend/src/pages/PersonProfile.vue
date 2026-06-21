<template>
  <div v-if="profile" class="min-h-full bg-surface-base">
    <div class="sticky top-0 z-0">
      <CoverImage
        :imageUrl="profile.cover_image"
        :imagePosition="profile.cover_image_position"
        :editable="isOwnProfile"
        @change="
          ({ imageUrl, imagePosition }) => {
            profileResource.setValue.submit({
              cover_image: imageUrl,
              cover_image_position: imagePosition,
            })
          }
        "
      />
      <div class="pointer-events-none absolute left-2 top-2 z-10">
        <div
          class="pointer-events-auto inline-flex max-w-full rounded-md border border-outline-gray-2 bg-surface-base/75 shadow-sm backdrop-blur-md"
        >
          <Button icon-left="lucide-arrow-left" variant="ghost" :route="{ name: 'People' }">
            People
          </Button>
        </div>
      </div>
    </div>
    <div class="relative z-10 -mt-4 min-h-[calc(100vh-162px)] bg-surface-base">
      <div class="mx-auto w-full max-w-[760px] px-3 sm:px-5">
        <ImagePreview v-model:show="imagePreview.show" :imageUrl="imagePreview.imageUrl" />
        <div class="grid items-center gap-5 pt-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
          <button
            v-if="currentUser.user_image"
            @click="openImagePreview(currentUser.user_image)"
            class="shrink-0 rounded-full bg-surface-base outline-none hover:brightness-110 focus-visible:ring focus-visible:ring-outline-gray-3"
          >
            <UserImage
              class="h-20 w-20 rounded-full border-4 border-outline-base object-cover"
              :user="currentUser.name"
            />
          </button>
          <button
            v-else
            @click="editDialog.show = true"
            class="h-20 w-20 shrink-0 rounded-full border-4 border-outline-base bg-surface-gray-3 text-sm text-ink-gray-5"
            :class="{ 'hover:bg-surface-gray-4': isOwnProfile }"
            :disabled="!isOwnProfile"
          >
            <span v-if="isOwnProfile">Upload Image</span>
          </button>
          <div class="min-w-0">
            <h2 class="text-3xl font-semibold leading-tight text-ink-gray-9">
              {{ displayName }}
            </h2>
            <p v-if="profile.bio" class="mt-1.5 max-w-[34rem] text-base leading-6 text-ink-gray-6">
              {{ profile.bio }}
            </p>
          </div>
          <Button
            v-if="isOwnProfile"
            icon-left="lucide-edit"
            @click="editDialog.show = true"
            class="hidden shrink-0 sm:flex"
          >
            Edit Profile
          </Button>
        </div>
        <Button
          v-if="isOwnProfile"
          label="Edit Profile"
          icon="lucide-edit"
          @click="editDialog.show = true"
          class="mt-4 sm:hidden"
        />
        <div class="mt-6 sm:ml-[6.75rem]">
          <TabButtons
            :buttons="[{ label: 'About' }, { label: 'Posts' }, { label: 'Replies' }]"
            v-model="activeTab"
          />
        </div>

        <router-view :profile="profileChildResource" />
      </div>
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
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Dialog, FormControl, TabButtons, useDoc, usePageMeta } from 'frappe-ui'
import CoverImage from '@/components/CoverImage.vue'
import ImagePreview from '../components/ImagePreview.vue'
import ProfileImageEditor from '@/components/ProfileImageEditor.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import UserImage from '@/components/UserImage.vue'
import { getScrollContainer } from '@/utils/scrollContainer'
import { useSessionUser, useUser } from '@/data/users'
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

interface ScrollContainerBackdrop {
  backgroundColor: string
  backgroundImage: string
  backgroundPosition: string
  backgroundRepeat: string
  backgroundSize: string
}

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()
const personId = computed(() => {
  return props.personId || route.params.personId?.toString() || 'missing-profile'
})

const editDialog = reactive({ show: false, editingProfilePhoto: false })
const imagePreview = reactive<{ show: boolean; imageUrl: string | null }>({
  show: false,
  imageUrl: null,
})

let scrollContainerBackdrop: ScrollContainerBackdrop | null = null

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
const currentUser = computed(() => useUser(profile.value?.user))
const displayName = computed(() => user.value?.full_name || profile.value?.full_name || '')
const coverImageUrl = computed(() => {
  let coverImage = profile.value?.cover_image
  if (!coverImage) return null
  if (coverImage.startsWith('https://images.unsplash.com')) {
    let width = window.innerWidth || 768
    return coverImage + `&w=${width}&fit=crop&crop=entropy,faces,focalpoint`
  }
  return coverImage
})

const activeTab = computed({
  get() {
    return (
      {
        PersonProfileAboutMe: 'About',
        PersonProfilePosts: 'Posts',
        PersonProfileReplies: 'Replies',
      }[route.name as string] || 'About'
    )
  },
  set(value) {
    let profileRoute = {
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

watch(coverImageUrl, setScrollBackdrop)
watch(profile, setScrollBackdrop, { deep: true })

onMounted(setScrollBackdrop)
onBeforeUnmount(restoreScrollBackdrop)

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
}

function discard() {
  userResource.reload()
  profileResource.reload()
  editDialog.show = false
  editDialog.editingProfilePhoto = false
}

function openImagePreview(imageUrl: string) {
  imagePreview.imageUrl = imageUrl
  imagePreview.show = true
}

function setScrollBackdrop() {
  let scrollContainer = getScrollContainer()
  if (!scrollContainer || !profile.value) return

  if (!scrollContainerBackdrop) {
    scrollContainerBackdrop = {
      backgroundColor: scrollContainer.style.backgroundColor,
      backgroundImage: scrollContainer.style.backgroundImage,
      backgroundPosition: scrollContainer.style.backgroundPosition,
      backgroundRepeat: scrollContainer.style.backgroundRepeat,
      backgroundSize: scrollContainer.style.backgroundSize,
    }
  }

  scrollContainer.style.backgroundColor = 'var(--surface-gray-2)'
  scrollContainer.style.backgroundImage = coverImageUrl.value
    ? `linear-gradient(to bottom, transparent 0 178px, var(--surface-base) 178px), url("${coverImageUrl.value}")`
    : 'none'
  scrollContainer.style.backgroundPosition = `top left, center ${
    profile.value.cover_image_position || 0
  }%`
  scrollContainer.style.backgroundRepeat = 'no-repeat, no-repeat'
  scrollContainer.style.backgroundSize = '100% 100%, 100% auto'
}

function restoreScrollBackdrop() {
  let scrollContainer = getScrollContainer()
  if (!scrollContainer || !scrollContainerBackdrop) return

  scrollContainer.style.backgroundColor = scrollContainerBackdrop.backgroundColor || ''
  scrollContainer.style.backgroundImage = scrollContainerBackdrop.backgroundImage || ''
  scrollContainer.style.backgroundPosition = scrollContainerBackdrop.backgroundPosition || ''
  scrollContainer.style.backgroundRepeat = scrollContainerBackdrop.backgroundRepeat || ''
  scrollContainer.style.backgroundSize = scrollContainerBackdrop.backgroundSize || ''
}

usePageMeta(() => {
  return {
    title: [profile.value?.full_name || '', 'Profile'].join(' | '),
  }
})
</script>
