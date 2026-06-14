<template>
  <NewSpaceDialog v-model="show" :lockedCommunityId="communityId" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NewSpaceDialog from '@/components/NewSpaceDialog.vue'

const props = defineProps<{
  communityId: string
}>()

const router = useRouter()
const show = ref(true)

// Closing the dialog (cancel or after create) returns to the community discussions.
watch(show, (open) => {
  if (!open) {
    router.replace({ name: 'Discussions', params: { communityId: props.communityId } })
  }
})
</script>
