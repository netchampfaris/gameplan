<template>
  <div class="h-[calc(100vh-49px)]">
    <header class="sticky top-0 z-10 border-b bg-white px-4 py-2.5 sm:px-5">
      <div class="flex items-center justify-between">
        <Breadcrumbs
          :items="[
            { label: 'Rooms', route: { name: 'Rooms' } },
            {
              label: room?.title || roomId,
              route: { name: 'Room', params: { roomId } },
            },
          ]"
        />
        <div class="h-7"></div>
      </div>
    </header>
    <div class="mx-auto h-full w-full max-w-4xl px-5 pt-6">
      <div class="flex h-full flex-col" v-if="$resources.messages.data">
        <div class="space-y-4">
          <div v-for="message in messages" :key="message.name">
            <div
              class="flex items-start gap-2"
              :class="{ 'flex-row-reverse': message.owner === $user().name }"
            >
              <UserAvatar
                v-if="message.owner !== $user().name"
                :user="message.owner"
                size="lg"
                class="flex-shrink-0"
              />
              <div
                class="flex max-w-md flex-col rounded p-2"
                :class="[
                  message.owner === $user().name
                    ? 'bg-orange-100'
                    : 'bg-gray-100',
                ]"
              >
                <div class="flex items-center">
                  <div class="text-base font-medium text-gray-900">
                    {{ $user(message.owner).full_name }}
                  </div>
                  <div class="ml-2 text-sm text-gray-500">
                    <time
                      class="text-gray-600"
                      :datetime="message.creation"
                      :title="$dayjs(message.creation)"
                    >
                      {{ $dayjs(message.creation).fromNow() }}
                    </time>
                  </div>
                </div>
                <div class="mt-1.5 text-base text-gray-600">
                  <CommentEditor :value="message.content" :editable="false" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-auto py-4">
          <div class="rounded border p-4">
            <CommentEditor
              :value="newMessage"
              @change="newMessage = $event"
              :submitButtonProps="{
                variant: 'solid',
                onClick: () => {
                  $resources.messages.insert.submit(
                    {
                      room: roomId,
                      content: newMessage,
                    },
                    { onSuccess: () => (newMessage = null) }
                  )
                },
                loading: $resources.messages.insert.loading,
              }"
              :discardButtonProps="{
                onClick: () => {
                  newMessage = null
                },
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Breadcrumbs } from 'frappe-ui'
export default {
  name: 'Room',
  props: {
    roomId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      newMessage: null,
    }
  },
  components: {
    Breadcrumbs,
  },
  resources: {
    room() {
      return {
        type: 'document',
        doctype: 'GP Room',
        name: this.roomId,
      }
    },
    messages() {
      return {
        type: 'list',
        doctype: 'GP Room Message',
        fields: ['name', 'content', 'owner', 'creation'],
        filters: { room: this.roomId },
        orderBy: 'creation asc',
        limit: 100,
        auto: true,
        realtime: true,
      }
    },
  },
  methods: {
    onNewMessageChange(value) {
      this.newMessage = value
    },
  },
  computed: {
    room() {
      return this.$resources.room.doc
    },
    messages() {
      return this.$resources.messages.data || []
    },
  },
}
</script>
