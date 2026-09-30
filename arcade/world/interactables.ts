import type Phaser from 'phaser'

/**
 * Things a player can walk up to and use. The map marks them in its
 * `Interactables` object layer (Tiled object `type` = kind, `name` = id); the
 * game decides what using one does.
 */
export type InteractableKind =
  | 'seat'
  | 'coffee'
  | 'noticeboard'
  | 'elevator'
  | 'arcade'
  | 'jukebox'
  | 'pet'
  | 'guestbook'
  | 'door'
  | 'plant'
  | 'puzzle'
  | 'darts'
  | 'party'

export type Facing = 'down' | 'left' | 'right' | 'up'

export interface Interactable {
  id: string
  kind: InteractableKind
  /** Pixel rect of the object's footprint on the map. */
  x: number
  y: number
  width: number
  height: number
  /** Seats: the way a seated avatar faces. */
  facing?: Facing
  /** Short name shown in the "E: …" prompt, e.g. "Sit", "Get coffee". */
  label?: string
}

export const INTERACTABLES_LAYER = 'Interactables'

const KINDS = new Set<InteractableKind>(['seat', 'coffee', 'noticeboard', 'elevator', 'arcade', 'jukebox', 'pet', 'guestbook', 'door', 'plant', 'puzzle', 'darts', 'party'])
const FACINGS = new Set<Facing>(['down', 'left', 'right', 'up'])

export function readInteractables(map: Phaser.Tilemaps.Tilemap): Interactable[] {
  const objects = map.getObjectLayer(INTERACTABLES_LAYER)?.objects ?? []
  return objects.flatMap((object) => {
    const kind = object.type as InteractableKind
    if (!KINDS.has(kind)) return []
    const properties = new Map<string, unknown>(
      ((object.properties ?? []) as { name: string; value: unknown }[]).map((p) => [p.name, p.value]),
    )
    const facing = properties.get('facing') as Facing | undefined
    const label = properties.get('label')
    return [
      {
        id: object.name || `${kind}-${object.id}`,
        kind,
        x: object.x ?? 0,
        y: object.y ?? 0,
        width: object.width ?? 0,
        height: object.height ?? 0,
        facing: facing && FACINGS.has(facing) ? facing : undefined,
        label: typeof label === 'string' ? label : undefined,
      },
    ]
  })
}
