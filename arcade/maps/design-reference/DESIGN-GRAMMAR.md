# LimeZu Design Grammar (extracted from 6_Home_Designs examples)

Tile IDs below are `room_builder` local ids (76 columns), usable directly via
`gid('room_builder', id)`. Extracted by pixel-matching the example layer PNGs
with `arcade/scripts/analyze_home_design.py`; the per-example grids in this
directory are the ground truth.

## Wall kit — gray "3D" interior walls (Generic_Home_1)

Horizontal walls are a 2-row south-facing band; vertical walls are a 1-column
body with special tiles at corners, T-junctions, and run ends.

| Piece | Tiles (top/bottom) | Notes |
| --- | --- | --- |
| Horizontal face run | `1141` / `1217` | repeat along the wall |
| Face left cap | `1140` / `1216` | first cell of a run (after gap/corner) |
| Face right cap | `1142` / `1218` | last cell of a run (before gap/corner) |
| Left wall body (face east) | `4310` | white outer edge west, beveled gray face east |
| Right wall body (face west) | `4313` | mirror of 4310 |
| NW corner cap | `4158` / `4234` | tops a 4310 column at the map's top wall |
| NE corner cap | `4161` / `4236` | tops a 4313 column |
| T-junction, left wall | `4159` / `4234` | where a horizontal band crosses a 4310 column |
| T-junction, right wall | `4160` / `4236` | where a horizontal band crosses a 4313 column |
| H-band attaches from west | `4386` / `4462` | vertical wall cells beside an incoming band |
| H-band attaches from east | `4389` / `4465` | mirror |
| South end cap | `~4461` / `~4466` | vertical wall ending into open space |

Doorways through a horizontal wall keep the 2 band rows as *floor* tiles
(threshold), e.g. diagonal wood `3074`/`3076` stacked.

## Floor kits — 3-wide x 2-tall shadow-variant blocks

Every Room_Builder floor is published as a 6-tile kit, NOT a seamless
pattern. Tiling all 6 tiles across a room bakes stray shadows everywhere —
this was the main source of the "unpolished" look.

Kit layout (sheet-relative):

```
TL  T   TFade      TL = top+left shadow   T = top shadow   TFade = shadow runout
L   PLAIN R        L  = left shadow       PLAIN = field fill
```

Usage rules observed in the examples:

- Cell directly south of a wall band → `T` (runs under doorway gaps too,
  or `TFade` directly under a doorway).
- Cell directly east of a vertical wall → `L`.
- Both → `TL`.
- Everything else → `PLAIN`. Right walls cast no shadow.

Known kits (top row ids; bottom row = id + 76):

| Floor | TL | T | TFade | L | PLAIN |
| --- | --- | --- | --- | --- | --- |
| Diagonal wood (Generic_Home_1 living) | 2998 | 2999 | 3000 | 3074 | 3075 |
| Stone tile (Generic_Home_1 kitchen) | 3314 | 3315 | 3316 | 3390 | 3391 |
| Golden wood | 1630 | 1631 | 1632 | 1706 | 1707 |
| Tan parquet (library) | 1634 | 1635 | 1636 | 1710 | 1711 |
| Dark gray stone (game room) | 2098 | 2099 | 2100 | 2174 | 2175 |
| Purple medallion carpet (conference) | 2246 | 2247 | 2248 | 2322 | 2323 |
| Beige squares (condominium) | 874 | 875 | 876 | 950 | 951 |

Caveat: not every 3-wide floor block is a shadow kit. The blue checkerboard
(2150..) is a repeating *pattern* — its "plain" tile alone renders as stripes.
If a kit-painted floor looks wrong, render one tile of it at zoom before
assuming kit semantics.

## Furnishing language (Generic_Home_1, Layer 2)

- Identity wall: fireplace centered on the top wall, tightly flanked by a
  matching chair pair, wall art above adjacent furniture.
- Zones are anchored by area rugs placed in open floor, not under every prop.
- Tall plants tuck into wall corners and beside furniture runs, on the floor
  shadow row so they read as against-the-wall.
- Wall-mounted decor (lamps, clock, mirror) sits on the lower face row of
  walls, roughly one per 4-6 tiles of bare wall.
- Doorways get a doormat/threshold and stay otherwise clear.
