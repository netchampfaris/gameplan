<template>
  <Dialog title="Add Community" v-model:open="showDialog">
    <div class="space-y-4">
      <TextInput
        label="Community Name"
        type="text"
        v-model="newTeam.title"
        placeholder="Community Name"
        @keydown.enter="createTeam($event.target.value)"
      />
      <Select
        label="Visibility"
        :options="[
          { label: 'Visible to everyone', value: 0 },
          { label: 'Visible to community members (Private)', value: 1 },
        ]"
        v-model="newTeam.is_private"
      />
      <ErrorMessage :message="communities.insert.error?.messages" />
    </div>
    <template #actions>
      <Button
        variant="solid"
        class="w-full"
        @click="createTeam(teamName)"
        :loading="communities.insert.loading"
      >
        Create Community
      </Button>
    </template>
  </Dialog>
</template>
<script>
import { Select, TextInput } from 'frappe-ui'
import { communities } from '@/data/communities'

export default {
  name: 'AddTeamDialog',
  components: { Select, TextInput },
  props: ['show'],
  emits: ['success', 'update:show'],
  data() {
    return {
      newTeam: { title: '', is_private: 0 },
      communities,
    }
  },
  methods: {
    createTeam() {
      communities.insert.submit(this.newTeam, {
        onSuccess: (team) => {
          this.$resetData('newTeam')
          this.showDialog = false
          this.$emit('success', team)
        },
      })
    },
  },
  computed: {
    showDialog: {
      get() {
        return this.show
      },
      set(val) {
        this.$emit('update:show', val)
      },
    },
  },
}
</script>
