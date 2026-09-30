import Phaser from 'phaser'
import { GameAssetPaths } from '../config/assets'
import { Depth } from '../config/depths'
import { seasonLight } from '../config/seasons'
import { RoomScene, type ArcadeServices, type RoomSceneData } from './RoomScene'

export const COMMON_ROOM_SCENE_KEY = 'scene:common-room'

/** The shared space everyone lands in, decorated during a season. */
export class CommonRoomScene extends RoomScene {
  constructor(services: ArcadeServices) {
    super(COMMON_ROOM_SCENE_KEY, services)
  }

  protected defaultRoom(): RoomSceneData {
    const { season } = this.services
    return { room: 'common', map: { url: season ? GameAssetPaths.maps.seasons[season] : GameAssetPaths.maps.world } }
  }

  create() {
    super.create()
    const { season } = this.services
    if (!season) return
    // A soft wash of the season's colour over the world; name tags stay untinted above it.
    this.add
      .rectangle(0, 0, this.map.widthInPixels, this.map.heightInPixels, seasonLight[season])
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(Depth.LIGHT)
  }
}
