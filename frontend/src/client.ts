import { createClient, createDefaultCacheAdapter } from '../../frappe-ui/frappe/client/vue'
import { toast } from 'frappe-ui'

export const { defineDoctype, store, socket } = createClient({
  cache: createDefaultCacheAdapter('gameplan-cache'),
  realtime: true,
  onError(error) {
    toast.create({
      type: 'error',
      message: error.messages[0]?.message || error.title,
    })
  },
})
