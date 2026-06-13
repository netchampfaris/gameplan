import { io, type Socket } from 'socket.io-client'
import { socketio_port } from '../../../../sites/common_site_config.json'
import { getCachedListResource, getCachedResource } from 'frappe-ui'

type RefetchResourceEvent = {
  cache_key?: string
}

type ReloadableResource = {
  reload: () => void
}

let socket: Socket | null = null

export function initSocket() {
  let host = window.location.hostname
  let siteName = window.site_name
  let port = window.location.port ? `:${socketio_port}` : ''
  let protocol = port ? 'http' : 'https'
  let url = `${protocol}://${host}${port}/${siteName}`

  socket = io(url, {
    withCredentials: true,
    reconnectionAttempts: 5,
  })
  socket.on('refetch_resource', (data: RefetchResourceEvent) => {
    if (data.cache_key) {
      let resource = getCachedResource(data.cache_key) || getCachedListResource(data.cache_key)
      if (isReloadableResource(resource)) {
        resource.reload()
      }
    }
  })
  return socket
}

export function useSocket() {
  return socket
}

function isReloadableResource(resource: unknown): resource is ReloadableResource {
  return Boolean(
    resource &&
      typeof resource === 'object' &&
      'reload' in resource &&
      typeof resource.reload === 'function',
  )
}
