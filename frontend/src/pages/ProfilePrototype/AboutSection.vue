<template>
  <!-- PROTOTYPE — throwaway. About as a full-width, auto-height section (variants B and C).
       Keeps today's inline ReadmeEditor, so editing behaviour is real, not mocked. -->
  <section v-if="profile.doc && (hasReadme || isOwnProfile)">
    <div class="mb-2 text-sm font-medium text-ink-gray-5">About</div>
    <article class="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
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
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ReadmeEditor from '@/components/editor/ReadmeEditor.vue'
import type { GPUserProfile } from '@/types/doctypes'

const props = defineProps<{
  profile: { doc?: GPUserProfile | null }
  isOwnProfile: boolean
}>()

const hasReadme = computed(() => Boolean(props.profile.doc?.readme?.trim()))
</script>
