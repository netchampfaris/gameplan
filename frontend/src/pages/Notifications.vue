<template>
  <MobileHeader class="sm:hidden" title="Inbox">
    <template #right>
      <Dropdown :options="mobileDropdownOptions" align="end">
        <template #default="{ open }">
          <Button
            variant="ghost"
            size="md"
            :icon-right="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
          >
            {{ activeTab }}
          </Button>
        </template>
      </Dropdown>
    </template>
  </MobileHeader>
  <PageHeader class="hidden sm:flex">
    <Breadcrumbs :items="[{ label: 'Inbox', route: { name: 'Notifications' } }]" />
    <div class="flex h-7 items-center space-x-2">
      <Button
        @click="confirmMarkAllAsRead"
        :loading="markAllAsRead.loading"
        v-if="canMarkAllAsRead"
      >
        Mark all as read
      </Button>
      <TabButtons
        :buttons="[{ label: 'Unread', active: true }, { label: 'Read' }]"
        v-model="activeTab"
      />
    </div>
  </PageHeader>
  <div class="body-container pt-5 sm:pt-6">
    <div class="divide-y">
      <div class="flex items-center justify-between py-2" v-for="d in notifications" :key="d.name">
        <div class="flex items-start space-x-2">
          <UserAvatar size="sm" :user="d.from_user" v-if="d.from_user" />
          <div class="grid h-5 w-5 place-items-center" v-if="d.type === 'Reaction'">
            <span class="lucide-heart h-4 w-4 text-ink-gray-6" />
          </div>
          <div class="text-base text-ink-gray-8">
            {{ d.message }} {{ dayjsLocal(d.creation).fromNow() }}
          </div>
        </div>
        <div class="ml-2 flex shrink-0 items-center space-x-2">
          <router-link
            v-if="d.discussion || d.task"
            class="block text-sm-medium text-ink-gray-5 hover:text-ink-gray-6"
            :to="
              d.discussion
                ? {
                    name: 'Discussion',
                    params: {
                      communityId: d.team,
                      spaceId: d.project,
                      postId: d.discussion,
                    },
                    query: d.comment ? { comment: d.comment } : null,
                  }
                : d.task
                  ? {
                      name: 'SpaceTask',
                      params: {
                        communityId: d.team,
                        spaceId: d.project,
                        taskId: d.task,
                      },
                      query: d.comment ? { comment: d.comment } : null,
                    }
                  : null
            "
            @click="markAsRead(d.name)"
          >
            {{ d.discussion ? 'View Discussion' : d.task ? 'View Task' : '' }}
          </router-link>
          <Tooltip text="Mark as read">
            <Button v-if="!d.read" variant="ghost" icon="lucide-x" @click="markAsRead(d.name)" />
          </Tooltip>
        </div>
      </div>
    </div>
    <div v-if="!notifications?.length" class="text-base text-ink-gray-5">Nothing to see here</div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TabButtons,
  Tooltip,
  Breadcrumbs,
  Dropdown,
  dayjsLocal,
  dialog,
  useCall,
  useList,
  usePageMeta,
} from 'frappe-ui'
import PageHeader from '@/components/PageHeader.vue'
import MobileHeader from '@/components/MobileHeader.vue'
import { unreadNotifications } from '@/data/notifications'
import { useSessionUser } from '@/data/users'
import type { GPNotification } from '@/types/doctypes'
import type { DropdownOptions } from 'frappe-ui'

type ActiveTab = 'Unread' | 'Read'

type NotificationRow = Pick<
  GPNotification,
  | 'name'
  | 'from_user'
  | 'message'
  | 'read'
  | 'type'
  | 'creation'
  | 'comment'
  | 'discussion'
  | 'task'
  | 'project'
  | 'team'
>

const activeTab = ref<ActiveTab>('Unread')
const sessionUser = useSessionUser()

const notificationFields: Array<keyof NotificationRow> = [
  'name',
  'from_user',
  'message',
  'read',
  'type',
  'creation',
  'comment',
  'discussion',
  'task',
  'project',
  'team',
]

const unreadNotificationList = useNotificationList(0, 'Unread Notifications')
const readNotificationList = useNotificationList(1, 'Read Notifications')

const markAllAsRead = useCall({
  url: 'gameplan.api.mark_all_notifications_as_read',
  immediate: false,
  onSuccess() {
    unreadNotifications.reload()
    unreadNotificationList.reload()
    readNotificationList.reload()
  },
})

const canMarkAllAsRead = computed(
  () => activeTab.value === 'Unread' && Boolean(unreadNotificationList.data?.length),
)

const mobileDropdownOptions = computed<DropdownOptions>(() => [
  {
    group: 'Filter',
    options: [
      {
        label: 'Unread',
        icon: activeTab.value === 'Unread' ? 'lucide-check' : null,
        selected: activeTab.value === 'Unread',
        onClick: () => {
          activeTab.value = 'Unread'
        },
      },
      {
        label: 'Read',
        icon: activeTab.value === 'Read' ? 'lucide-check' : null,
        selected: activeTab.value === 'Read',
        onClick: () => {
          activeTab.value = 'Read'
        },
      },
    ],
  },
  {
    group: '',
    options: [
      {
        label: 'Mark all as read',
        condition: () => canMarkAllAsRead.value,
        onClick: () => {
          confirmMarkAllAsRead()
        },
      },
    ],
  },
])

const notifications = computed(() =>
  activeTab.value === 'Unread' ? unreadNotificationList.data : readNotificationList.data,
)

function markAsRead(name: string) {
  unreadNotificationList.setValue.submit({ name, read: 1 }).then(() => {
    unreadNotifications.reload()
    unreadNotificationList.reload()
    readNotificationList.reload()
  })
}

function confirmMarkAllAsRead() {
  dialog.confirm({
    title: 'Mark all as read',
    message: 'Are you sure you want to mark all unread notifications as read?',
    confirmLabel: 'Mark all as read',
    onConfirm: () => markAllAsRead.submit(),
  })
}

function useNotificationList(read: 0 | 1, cacheKey: string) {
  return useList<NotificationRow>({
    doctype: 'GP Notification',
    filters: () => ({ to_user: sessionUser.name, read }),
    fields: notificationFields,
    orderBy: 'creation desc',
    cacheKey,
  })
}

unreadNotifications.reload()
usePageMeta(() => ({ title: 'Notifications' }))
</script>
