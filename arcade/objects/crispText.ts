import Phaser from 'phaser'

/**
 * Text drawn in world space that stays sharp. The game renders with `pixelArt`, which
 * gives every texture nearest-neighbour filtering; text needs a high resolution and
 * smooth filtering instead, or it turns blocky as the camera zooms.
 */

const TEXT_RESOLUTION = 4
export const WORLD_FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

export function crispText(
  scene: Phaser.Scene,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const object = scene.add.text(0, 0, text, { fontFamily: WORLD_FONT, ...style, resolution: TEXT_RESOLUTION })
  object.texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
  return object
}
