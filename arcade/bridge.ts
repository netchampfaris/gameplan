import { reactive } from 'vue'
import type { AvatarAppearance } from './avatar/catalog'
import type { Celebration } from './interactions/party'
import type { CatStatus } from './interactions/pet'
import type { PlantStatus } from './interactions/plant'
import type { Home, HomeProblem } from './maps/home'
import type { PrefabId } from './maps/prefabs'
import type { FloorId, WallpaperId } from './maps/rooms'
import type { EmoteId, RoomId } from './net/protocol'
import { Emitter } from './util/emitter'

/**
 * The one link between the HUD (Vue) and the world (Phaser).
 *
 * The game writes `state`, which is reactive, and the HUD renders it. The HUD calls the
 * methods, and the game listens for them through `commands`. Neither side reaches into
 * the other, and nothing is global: `Arcade.vue` makes one bridge and hands it to both.
 */

export type KeyboardOwner = 'game' | 'hud'

export interface PresenceEntry {
  /** Socket id; one user in two tabs is two entries. */
  id: string
  user: string
  fullName: string
  appearance: AvatarAppearance
  isSelf: boolean
}

/** What pressing E would do, e.g. "Sit", and the id of the Interactable it would use. */
export interface Prompt {
  label: string
  target: string
}

/** A board of notes the HUD shows. `target` is the Interactable that opened it. */
export type NoteBoard =
  | { target: string; board: 'Notice Board' }
  | { target: string; board: 'Guestbook'; home: string; ownerName: string }

/** A dart someone else in the Room threw. */
export interface DartThrow {
  fullName: string
  score: number
}

/** Where the player can go: the Common Room (at a spawn point) or someone's Home. */
export type Destination = { kind: 'common'; spawn?: string } | { kind: 'home'; user: string }

/** The Home being decorated, as the game has it. Only its owner ever decorates. */
export interface DecorateState {
  /** What Save stores: the draft, with an item picked up from the room still in its place. */
  home: Home
  /** The catalog or room item following the pointer, if any. */
  holding: PrefabId | null
  /** What is held was picked up from the room, so it can be removed, not only put back. */
  picked: boolean
  /** Why the held item cannot go where the pointer is, or null when it can. */
  problem: HomeProblem | null
  /** The draft differs from the saved Home. */
  dirty: boolean
}

export type DecorateCommand =
  | { action: 'start' }
  | { action: 'hold'; prefab: PrefabId }
  /** Put back what is held: a room item returns to its place. */
  | { action: 'drop' }
  /** Throw away what is held. */
  | { action: 'remove' }
  | { action: 'surface'; wallpaper: WallpaperId }
  | { action: 'surface'; floor: FloorId }
  /** Screen pixels the HUD covers on the right and at the bottom, for framing the room. */
  | { action: 'inset'; right: number; bottom: number }
  /** Leave decorate mode. `saved` is the Home that was stored, or null to throw the draft away. */
  | { action: 'end'; saved: Home | null }

export interface ArcadeState {
  connection: 'connecting' | 'connected' | 'failed'
  /** Why the connection failed, in words for the player. */
  error: string | null
  room: RoomId | null
  /** Everyone in the Room, the player first. */
  occupants: PresenceEntry[]
  /** What pressing E would do, or null when nothing is in reach. */
  prompt: Prompt | null
  /** Who gets key presses. While the HUD has them, the Avatar does not move. */
  keyboard: KeyboardOwner
  appearance: AvatarAppearance
  /** The notes the player opened from a board, or null. */
  board: NoteBoard | null
  /** Goes up whenever someone else in the Room pins or removes a note. */
  boardRevision: number
  /** The shared plant in this Room, as last loaded, and the Interactable it stands at. */
  plant: { target: string; status: PlantStatus } | null
  /** Today's celebrations at the party corner, as last loaded, or null on a day with none. */
  party: { target: string; celebrations: Celebration[] } | null
  /** The team cat in this Room, as last loaded, and the Interactable that follows it. */
  cat: { target: string; status: CatStatus } | null
  /** The Home the player is in: whose it is. */
  home: { owner: string; ownerName: string } | null
  /** The Home directory is open (the elevator opens it). */
  directoryOpen: boolean
  /** The daily puzzle is open (the puzzle cabinet opens it). */
  puzzleOpen: boolean
  /** The darts dialog is open at this darts line, or null. */
  darts: string | null
  /** The last dart someone else in the Room threw, a new object for each dart. */
  lastDart: DartThrow | null
  /** Decorate mode, while the owner is in it. */
  decorate: DecorateState | null
  /** A Room is loading after `travel`. */
  travelling: boolean
  /** Something went wrong that the HUD should say once, then clear. */
  notice: string | null
}

export interface BridgeCommands {
  say: { text: string }
  emote: { emote: EmoteId }
  appearance: { appearance: AvatarAppearance }
  keyboard: { owner: KeyboardOwner }
  notes: { target: string }
  darts: { target: string; score: number }
  cat: { target: string; status: CatStatus }
  travel: Destination
  decorate: DecorateCommand
}

export class ArcadeBridge {
  readonly state: ArcadeState
  readonly commands = new Emitter<BridgeCommands>()

  constructor(appearance: AvatarAppearance) {
    this.state = reactive({
      connection: 'connecting',
      error: null,
      room: null,
      occupants: [],
      prompt: null,
      keyboard: 'game',
      appearance,
      board: null,
      boardRevision: 0,
      plant: null,
      party: null,
      cat: null,
      home: null,
      directoryOpen: false,
      puzzleOpen: false,
      darts: null,
      lastDart: null,
      decorate: null,
      travelling: false,
      notice: null,
    })
  }

  say(text: string) {
    this.commands.emit('say', { text })
  }

  emote(emote: EmoteId) {
    this.commands.emit('emote', { emote })
  }

  /** Shows a new look in the world and to everyone in the Room. Saving it is the HUD's job. */
  setAppearance(appearance: AvatarAppearance) {
    this.state.appearance = appearance
    this.commands.emit('appearance', { appearance })
  }

  setKeyboardOwner(owner: KeyboardOwner) {
    if (this.state.keyboard === owner) return
    this.state.keyboard = owner
    this.commands.emit('keyboard', { owner })
  }

  closeBoard() {
    this.state.board = null
  }

  /** The player pinned or removed a note on a board; the game tells the Room. */
  notesChanged(target: string) {
    this.commands.emit('notes', { target })
  }

  /** The player threw a dart from a darts line; the game shows it and tells the Room. */
  dartThrown(target: string, score: number) {
    this.commands.emit('darts', { target, score })
  }

  /** The player renamed the team cat; the game shows the new name and tells the Room. */
  catRenamed(target: string, status: CatStatus) {
    this.commands.emit('cat', { target, status })
  }

  /** Leaves this Room for another. The game loads it and moves the player there. */
  travel(destination: Destination) {
    this.state.directoryOpen = false
    this.commands.emit('travel', destination)
  }

  decorate(command: DecorateCommand) {
    this.commands.emit('decorate', command)
  }

  destroy() {
    this.commands.clear()
  }
}
