export type ServerEventListener<T = unknown> = (value: T) => void
export type ServerEventsStatus = 'idle' | 'connecting' | 'open' | 'closed'

type NativeHandler = (event: MessageEvent<string>) => void

class ServerEvents {
  private source: EventSource | null = null
  private listeners = new Map<string, Set<ServerEventListener>>()
  private internalListeners = new Map<string, Set<ServerEventListener>>()
  private handlers = new Map<string, NativeHandler>()
  private reconnectTimer: number | null = null
  private url = 'http://gameplan.frappe.test:8000/g/events'
  private manuallyClosed = false

  status: ServerEventsStatus = 'idle'

  connect(url = this.url) {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return
    }

    this.url = url
    this.manuallyClosed = false

    if (this.source && this.source.readyState !== EventSource.CLOSED) {
      return
    }

    this.clearReconnectTimer()
    this.status = 'connecting'

    const source = new EventSource(this.url, { withCredentials: true })
    this.source = source

    source.onopen = () => {
      if (this.source !== source) {
        return
      }
      this.status = 'open'
    }

    source.onerror = () => {
      if (this.source !== source) {
        return
      }

      this.status = this.manuallyClosed ? 'closed' : 'connecting'
      if (source.readyState === EventSource.CLOSED && !this.manuallyClosed) {
        this.source = null
        this.scheduleReconnect()
      }
    }

    for (const key of this.getActiveKeys()) {
      source.addEventListener(key, this.getHandler(key))
    }
  }

  disconnect() {
    this.manuallyClosed = true
    this.clearReconnectTimer()

    if (this.source) {
      for (const key of this.getActiveKeys()) {
        this.source.removeEventListener(key, this.getHandler(key))
      }
      this.source.close()
      this.source = null
    }

    this.status = 'closed'
  }

  on<T = unknown>(key: string, listener: ServerEventListener<T>) {
    const listeners = this.listeners.get(key) || new Set<ServerEventListener>()
    listeners.add(listener as ServerEventListener)
    this.listeners.set(key, listeners)

    if (this.source) {
      this.source.addEventListener(key, this.getHandler(key))
    }

    return () => this.off(key, listener)
  }

  once<T = unknown>(key: string, listener: ServerEventListener<T>) {
    const stop = this.on<T>(key, (value) => {
      stop()
      listener(value)
    })

    return stop
  }

  off<T = unknown>(key: string, listener: ServerEventListener<T>) {
    const listeners = this.listeners.get(key)
    if (!listeners) {
      return
    }

    listeners.delete(listener as ServerEventListener)
    if (listeners.size) {
      return
    }

    this.listeners.delete(key)
    if (!this.internalListeners.has(key) && this.source) {
      this.source.removeEventListener(key, this.getHandler(key))
    }
  }
  private addInternalListener(key: string, listener: ServerEventListener) {
    const listeners = this.internalListeners.get(key) || new Set<ServerEventListener>()
    listeners.add(listener)
    this.internalListeners.set(key, listeners)
  }

  private dispatch(key: string, value: unknown) {
    this.internalListeners.get(key)?.forEach((listener) => listener(value))
    this.listeners.get(key)?.forEach((listener) => listener(value))
  }

  private getActiveKeys() {
    const keys = new Set<string>()
    this.listeners.forEach((_listeners, key) => keys.add(key))
    this.internalListeners.forEach((_listeners, key) => keys.add(key))
    return keys
  }

  private getHandler(key: string) {
    let handler = this.handlers.get(key)
    if (handler) {
      return handler
    }

    handler = (event: MessageEvent<string>) => {
      this.dispatch(key, this.parse(event.data))
    }
    this.handlers.set(key, handler)
    return handler
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manuallyClosed || typeof window === 'undefined') {
      return
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect(this.url)
    }, 1000)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer || typeof window === 'undefined') {
      return
    }

    window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private parse(data: string) {
    if (!data) {
      return null
    }

    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
}

export const serverEvents = new ServerEvents()
