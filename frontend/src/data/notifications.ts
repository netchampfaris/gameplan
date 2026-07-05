import { useCall } from 'frappe-ui'

export let unreadNotifications = useCall({
  cacheKey: 'Unread Notifications Count',
  staleOnError: true,
  url: '/api/v2/method/gameplan.api.unread_notifications',
  initialData: 0,
})
