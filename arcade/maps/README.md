# Arcade Map Authoring

Use the generated map pipeline for fast iteration instead of editing Tiled JSON by hand.

## Files

| File | Purpose |
| --- | --- |
| `prefabs.ts` | Named multi-tile objects from the spritesheet. |
| `commonRoom.layout.ts` | The room layout: prefab names and tile coordinates. |
| `tiled.ts` | Shared helpers for generating Tiled JSON. |
| `../scripts/buildCommonRoomMap.ts` | Writes the generated `common_room.json`. |

## Iterate

Edit `commonRoom.layout.ts`, then run:

```sh
yarn build:arcade-map
```

Open or reload:

```txt
gameplan/public/limezu-modern-interiors/maps/common_room.json
```

The map keeps `Spawn Points`, `Collision`, and `Object Palette` hidden by default so the first preview focuses on the room.
