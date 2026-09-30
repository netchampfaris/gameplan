import Phaser from 'phaser'
import { GameAssetKeys } from '../config/assets'
import { EMOTES, type EmoteId } from '../net/protocol'
import type { Facing } from '../world/interactables'
import { appearanceKey, type AvatarAppearance } from './catalog'
import { composeAvatarSheet } from './compositor'
import { EMOTE_DEFINITIONS, EMOTE_INTRO, EMOTE_TRAIL } from './emotes'
import { compositeFrames, facingsOf, FRAME_HEIGHT, FRAME_WIDTH, FRAMES_PER_DIRECTION, frameName, frameRateOf, SHEET_ROWS, type AvatarState } from './sheet'

/**
 * Phaser textures and animations for Avatars and emotes. Both live on the game, not the
 * scene, so a look composed once is reused by every Room.
 */

const pending = new WeakMap<Phaser.Game, Map<string, Promise<string>>>()

export function avatarTextureKey(appearance: AvatarAppearance): string {
  return `avatar:${appearanceKey(appearance)}`
}

export function avatarAnimationKey(textureKey: string, state: AvatarState, facing: Facing): string {
  return `${textureKey}:${state}:${facing}`
}

/**
 * Registers the texture and animations for an appearance and resolves with the texture
 * key. Concurrent calls for the same look share one composition.
 */
export function ensureAvatarTexture(game: Phaser.Game, appearance: AvatarAppearance): Promise<string> {
  const key = avatarTextureKey(appearance)
  if (game.textures.exists(key)) return Promise.resolve(key)

  let inFlight = pending.get(game)
  if (!inFlight) {
    inFlight = new Map()
    pending.set(game, inFlight)
  }
  const existing = inFlight.get(key)
  if (existing) return existing

  const loading = composeAvatarSheet(appearance)
    .then((canvas) => {
      // The game may have been torn down while the layers loaded; its texture manager
      // drops its game reference when it is destroyed.
      if (game.textures.game && !game.textures.exists(key)) registerSheet(game, key, canvas)
      return key
    })
    .finally(() => inFlight.delete(key))
  inFlight.set(key, loading)
  return loading
}

function registerSheet(game: Phaser.Game, key: string, canvas: HTMLCanvasElement) {
  const texture = game.textures.addCanvas(key, canvas)
  if (!texture) throw new Error(`Avatar texture could not be added: ${key}`)
  for (const frame of compositeFrames()) texture.add(frame.name, 0, frame.x, frame.y, FRAME_WIDTH, FRAME_HEIGHT)

  for (const row of SHEET_ROWS) {
    for (const facing of facingsOf(row.state)) {
      game.anims.create({
        key: avatarAnimationKey(key, row.state, facing),
        frames: Array.from({ length: FRAMES_PER_DIRECTION }, (_, index) => ({
          key,
          frame: frameName(row.state, facing, index),
        })),
        frameRate: frameRateOf(row.state),
        repeat: -1,
      })
    }
  }
}

export const EMOTE_INTRO_ANIMATION = 'emote:intro'
export const EMOTE_TRAIL_ANIMATION = 'emote:trail'

export function emoteIconAnimation(emote: EmoteId): string {
  return `emote:${emote}`
}

/** Emote animations, once the emote sheet has loaded as a 48x48 spritesheet. */
export function registerEmoteAnimations(game: Phaser.Game) {
  const frames = (indices: readonly number[]) => indices.map((frame) => ({ key: GameAssetKeys.emotes, frame }))
  if (!game.anims.exists(EMOTE_INTRO_ANIMATION)) {
    game.anims.create({ key: EMOTE_INTRO_ANIMATION, frames: frames(EMOTE_INTRO), frameRate: 14 })
    game.anims.create({ key: EMOTE_TRAIL_ANIMATION, frames: frames(EMOTE_TRAIL), frameRate: 14 })
  }
  for (const emote of EMOTES) {
    const key = emoteIconAnimation(emote)
    if (!game.anims.exists(key)) {
      game.anims.create({ key, frames: frames(EMOTE_DEFINITIONS[emote].icon), frameRate: 3, repeat: -1 })
    }
  }
}
