# Arcade Map Authoring

Use the generated map pipeline for fast iteration instead of editing Tiled JSON by hand.

## Files

| File | Purpose |
| --- | --- |
| `prefabs.ts` | Named multi-tile objects, floor kits, and the wall kit from the spritesheets. |
| `rooms.ts` | `WallPlan`: resolves wall junctions/corners/door stubs and paints shadow-aware floors. |
| `world.layout.ts` | The world map: room rects, doorways, and furniture placements. |
| `commonRoom.layout.ts` | Legacy standalone common-room map. |
| `tiled.ts` | Shared helpers + tileset registry for generating Tiled JSON. |
| `design-reference/` | Tile grids reverse-engineered from the LimeZu example designs + DESIGN-GRAMMAR.md. |
| `../scripts/buildWorldMap.ts` | Writes the generated `world.json` (the map the game loads). |
| `../scripts/analyze_home_design.py` | Pixel-matches an example design PNG into a tile-ID grid. |
| `../scripts/render_map.py` | Composites a generated map JSON into a PNG for visual review. |

## Iterate

Edit `world.layout.ts`, then run:

```sh
yarn build:arcade-map
```

Preview without the browser (uses the bench virtualenv's Python for Pillow):

```sh
~/Projects/frappe-bench-2/env/bin/python arcade/scripts/render_map.py \
  gameplan/public/limezu-modern-interiors/maps/world.json /tmp/world.png
```

Or reload `http://gameplan.frappe.test:8080/g/arcade`.

## Design language

Walls and floors come from kits extracted from the official example designs —
see `design-reference/DESIGN-GRAMMAR.md` before picking new tiles. To study
another example (e.g. for a new room theme), run the analyzer on its layer
PNGs under `gameplan/public/limezu-modern-interiors/6_Home_Designs/` and read
the resulting grid in `design-reference/`.

The map keeps `Spawn Points`, `Collision`, and `Object Palette` hidden by
default so the first preview focuses on the room.
