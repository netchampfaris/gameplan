<template>
  <div>
    <header class="sticky top-0 z-10 border-b bg-white px-4 py-2.5 sm:px-5">
      <div class="flex items-center justify-between">
        <Breadcrumbs :items="[{ label: 'Rooms', route: { name: 'Rooms' } }]" />
        <div class="h-7"></div>
      </div>
    </header>
    <div class="mx-auto w-full max-w-4xl px-5 pt-6">
      <div class="flex items-center justify-between">
        <!-- <h2 class="text-xl font-semibold">{{ people.length }} members</h2> -->
        <div class="flex items-center gap-2">
          <!-- <Select
            :options="[
              { label: 'Name', value: 'full_name asc' },
              { label: 'Last updated', value: 'modified desc' },
              { label: 'Posts', value: 'posts' },
              { label: 'Replies', value: 'replies' },
            ]"
            v-model="orderBy"
          >
            <template #prefix>
              <LucideArrowDownUp class="w-4 text-gray-600" />
            </template>
          </Select> -->
          <Button variant="solid" @click="newRoomDialog = true">
            <template #prefix><LucideUserPlus2 class="w-4" /></template>
            New Room
          </Button>
        </div>
      </div>

      <div class="mt-6 pb-16">
        <template v-for="room in $resources.rooms.data" :key="room.name">
          <router-link
            :to="{ name: 'Room', params: { roomId: room.name } }"
            class="flex rounded px-2 py-2.5 hover:bg-gray-100"
            exact-active-class="!bg-gray-100"
          >
            <div class="flex w-3/5 items-center">
              <!-- <UserAvatar :user="user.user" size="2xl" /> -->
              <div class="ml-3 min-w-0">
                <div class="flex items-center space-x-2">
                  <div class="text-base font-medium text-gray-900">
                    {{ room.title }}
                  </div>
                </div>
                <div
                  v-if="room.last_message"
                  class="mt-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base text-gray-600"
                >
                  {{ room.last_message }}
                </div>
              </div>
            </div>
            <div
              class="flex w-1/5 items-center justify-end text-right text-base text-gray-600"
            >
              <!-- <router-link
                class="text-base text-gray-600 hover:text-gray-900"
                :to="{
                  name: 'PersonProfileReplies',
                  params: { personId: user.name },
                }"
                @click.prevent
              >
                {{ user.comments_count }} replies
              </router-link> -->
            </div>
          </router-link>
          <div class="mx-2 border-b"></div>
        </template>
        <div class="p-3" v-if="$resources.rooms.hasNextPage">
          <Button
            @click="$resources.rooms.next()"
            :loading="$resources.rooms.list.loading"
          >
            Load more
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Breadcrumbs } from 'frappe-ui'
export default {
  name: 'Rooms',
  components: {
    Breadcrumbs,
  },
  resources: {
    rooms() {
      return {
        type: 'list',
        doctype: 'GP Room',
        fields: ['name', 'title', 'users_count'],
        limit: 100,
        orderBy: 'last_message_at desc',
        auto: true,
      }
    },
  },
}
</script>
