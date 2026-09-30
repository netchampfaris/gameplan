/**
 * A minimal typed event emitter: `Events` maps each event name to its payload.
 * `on` returns the matching unsubscribe function.
 */
export class Emitter<Events extends object> {
  private handlers = new Map<keyof Events, Set<(payload: never) => void>>()

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
    }
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        ;(handler as (payload: Events[K]) => void)(payload)
      } catch (error) {
        // One failing listener must not stop the others.
        console.error(`Listener for "${String(event)}" failed`, error)
      }
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}
