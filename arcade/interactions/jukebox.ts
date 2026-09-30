import type Phaser from 'phaser'
import { floatUp, NOTE_COLORS, pixelIcon, type PixelIcon } from '../objects/pixelIcons'
import type { Interactable } from '../world/interactables'
import type { InteractionContext, InteractionHandler } from './registry'

/** How long a song plays. Starting it again while it plays starts the time over. */
const SONG_MS = 20_000
/** A new note leaves the jukebox this often while it plays. */
const NOTE_EVERY_MS = 380
/** Avatars whose feet are this close to the jukebox bob along with a music emote. */
const LISTENING_DISTANCE = 160
const ICONS: readonly PixelIcon[] = ['note', 'notes', 'note']

/**
 * A short music moment, with no sound: notes rise from the jukebox for everyone in the
 * Room, and whoever stands near it shows a music emote. Each game shows the emote for its
 * own player and shares it like any other emote, so it reaches everyone once.
 */
class Song {
  private readonly scene: Phaser.Scene
  private readonly target: Interactable
  private spawner: Phaser.Time.TimerEvent | null = null
  private endsAt = 0
  private count = 0

  constructor(scene: Phaser.Scene, target: Interactable) {
    this.scene = scene
    this.target = target
  }

  play({ player, net }: InteractionContext) {
    this.endsAt = this.scene.time.now + SONG_MS
    this.spawner ??= this.scene.time.addEvent({
      delay: NOTE_EVERY_MS,
      loop: true,
      callback: () => this.spawn(),
    })
    this.spawn()

    const { x, y, width, height } = this.target
    const dx = Math.max(x - player.sprite.x, 0, player.sprite.x - (x + width))
    const dy = Math.max(y - player.sprite.y, 0, player.sprite.y - (y + height))
    if (Math.hypot(dx, dy) <= LISTENING_DISTANCE) {
      player.avatar.emote('music')
      net.emote('music')
    }
  }

  destroy() {
    this.spawner?.remove()
    this.spawner = null
  }

  private spawn() {
    if (this.scene.time.now >= this.endsAt) {
      this.destroy()
      return
    }
    const index = this.count++
    const icon = ICONS[index % ICONS.length]
    const color = NOTE_COLORS[index % NOTE_COLORS.length]
    const { x, y, width } = this.target
    floatUp(
      this.scene,
      pixelIcon(this.scene, icon, color),
      x + width * (0.2 + Math.random() * 0.6),
      y + 8,
      {
        rise: 56 + Math.random() * 32,
        sway: 6 + Math.random() * 6,
        duration: 2200 + Math.random() * 800,
      },
    )
  }
}

const songs = new WeakMap<Interactable, Song>()

export const jukebox: InteractionHandler = {
  label: 'Play music',
  setup(target, { scene }) {
    const song = new Song(scene, target)
    songs.set(target, song)
    return { destroy: () => song.destroy() }
  },
  interact(target, context) {
    songs.get(target)?.play(context)
    context.net.use(target.id)
  },
  observe(target, _actor, context) {
    songs.get(target)?.play(context)
  },
}
