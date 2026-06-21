<template>
  <div v-if="profile.doc" class="mt-3 pb-16">
    <article class="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
      <div class="mb-3 text-sm font-medium text-ink-gray-5">About</div>
      <ReadmeEditor
        :resource="profile"
        :editable="isOwnProfile"
        fieldname="readme"
        :placeholder="
          isOwnProfile ? 'Write a brief introduction of yourself...' : 'No introduction'
        "
        :border="false"
      />
    </article>
  </div>
</template>
<script setup lang="ts">
import ReadmeEditor from '@/components/editor/ReadmeEditor.vue'
import { computed } from 'vue'
import { useSessionUser } from '@/data/users'
import type { GPUserProfile } from '@/types/doctypes'

defineOptions({
  name: 'PersonProfileAboutMe',
})

const props = defineProps<{
  profile: {
    doc?: GPUserProfile | null
  }
}>()

const sessionUser = useSessionUser()
const isOwnProfile = computed(() => props.profile.doc?.user === sessionUser.name)
</script>
