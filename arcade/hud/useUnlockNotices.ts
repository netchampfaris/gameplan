import { toast } from 'frappe-ui'
import type { Socket } from 'socket.io-client'
import { onBeforeUnmount } from 'vue'
import { isPrefabId, prefabs } from '../maps/prefabs'

/** Mirrors ITEM_UNLOCKED in `gp_arcade_profile.py`, which publishes it; not a presence event. */
const ITEM_UNLOCKED = 'arcade:item_unlocked'

interface ItemUnlocked {
  item: string
  source: string
}

/**
 * Tells the player about an item they just unlocked, even one a scheduled job granted
 * while they play. The server pushes the event to the user's tabs after the commit; this
 * shows a toast and calls `onUnlocked`, which reloads the profile so the catalog updates.
 */
export function useUnlockNotices(socket: Socket | null, onUnlocked: () => void) {
  function onEvent(message: ItemUnlocked) {
    const name = isPrefabId(message.item) ? prefabs[message.item].name : message.item
    toast.success(`New item: ${name}`)
    onUnlocked()
  }

  socket?.on(ITEM_UNLOCKED, onEvent)
  onBeforeUnmount(() => socket?.off(ITEM_UNLOCKED, onEvent))
}
