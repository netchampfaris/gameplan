# LimeZu Design Grammar (extracted from 6_Home_Designs examples)

Tile IDs below are `room_builder` local ids (76 columns), usable directly via
`gid('room_builder', id)`. Extracted by pixel-matching the example layer PNGs
with `arcade/scripts/analyze_home_design.py`; the per-example grids in this
directory are the ground truth.

## Walls: wallpaper swatch + matching "3D" side kit

`rooms.ts` draws every room the way the Condominium and Ice Cream Shop examples
do: a 3-row wallpapered top wall, 1-column side walls from a "3D" kit in the
same colour, and a thin white bottom band.

### Top wall: the 3-row face

Wallpaper swatches are 10 x 2 blocks at columns 0, 11 and 22 of Room_Builder
rows 11 to 46. Offsets are from the swatch's top-left:

| Face row | Tiles (start, mid, end) | Notes |
| --- | --- | --- |
| 0: band | row +0, columns +0..2 | the top edge of the wallpaper |
| 1: plain | row +0, columns +4..6 | the repeating pattern |
| 2: baseboard | row +1, columns +0..2 | meets the floor |

`mid` repeats along the wall. `start` and `end` close a run where it meets a
doorway, so the floor shows through with a clean edge.

### Side walls: the "3D" kit

Kits are 8 x 7 blocks at columns 44, 52 and 60. Offsets are (column, row) from
the block's corner:

| Piece | Left wall | Right wall |
| --- | --- | --- |
| Corner, rows 0-2 (column starts at this room's top wall) | (1,1) (1,2) (1,3) | (6,1) (6,2) (6,3) |
| Joined, rows 0-2 (column continues the room above) | (1,0) (1,2) (1,3) | (6,0) (6,2) (6,3) |
| Body, every row below | (2,2) | (5,2) |

### Swatch and kit pairs

Each pair was pixel-matched, so corners and faces meet without a seam. The ids
are what saved Home layouts store.

| Wallpaper id | Swatch (row, column) | Kit (row, column) |
| --- | --- | --- |
| `wood-stripes` | 17, 11 | 82, 44 |
| `brown` | 25, 11 | 54, 44 |
| `beige-trim` | 33, 0 | 75, 52 |
| `cream` | 23, 0 | 75, 60 |
| `white-diamonds` | 11, 0 | 68, 44 |
| `gray` | 15, 0 | 54, 52 |
| `charcoal` | 45, 0 | 61, 52 |
| `lavender` | 41, 11 | 54, 60 |
| `blue` | 45, 11 | 61, 60 |
| `light-blue` | 19, 22 | 90, 60 |
| `teal` | 23, 22 | 90, 52 |
| `sage` | 31, 22 | 90, 44 |
| `red` | 43, 11 | 82, 60 |

### Partitions and the bottom band

- A room below another uses **its own** top wall as the partition. The room
  above sets `bottomWall: false`, so the rooms share a wall rather than stacking
  two.
- Where a side column continues a column from the room above, it uses the
  `joined` pieces instead of the `corner`.
- Doorways are 2 tiles wide through the top wall. All 3 wall rows become plain
  floor there.
- The last room row is a thin white band, shared by every wallpaper:
  Room_Builder (59,46) start, (59,47) mid, (59,49) end.
- Two rooms side by side share one side column: the room on the right starts
  on the left room's last column (the Café sits at x 12, where the Library's
  right wall is). The later room in `world.layout.ts` paints the shared cells.
  Two separate side columns read as a double-width wall.

Floors directly under a wall row take the top-shadow variant, and floors right
of a left side column take the left-shadow variant. See the floor kits below.

### Older wall kit (not used)

The gray 2-row walls from Generic_Home_1 (face `1140`/`1141`/`1142` over
`1216`/`1217`/`1218`, bodies `4310`/`4313`) do not carry wallpaper, so the map
no longer uses them. The grids in this folder still show where they sit.

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

## Furniture sheets that are easy to misread

- **Kitchen counter** (`12_Kitchen`, 16 columns): a counter is 2 rows, a top
  surface over a front, built from 1-wide pieces:

  | Piece | Top | Front |
  | --- | --- | --- |
  | Left end | 41 | 115 |
  | Cupboard | 42 | 116 |
  | Drawers | 42 | 117 |
  | Right end | 43 | 118 |

  Machines and displays are `tabletop` prefabs whose bottom row sits on the
  counter's top row. A counter against the top wall starts on the first floor
  row, so a 2-tall machine's upper half overlaps the wall's baseboard.
- **Side couches** (`11_Living_Room`): 2 wide x 4 tall, and the sheet rows
  are out of order. For a couch whose top-left id is `a`, the rows top to
  bottom are `a`, `a+16`, `a+48`, `a+32`. Pairs, facing left then right: gray
  515/517, blue 519/521, lavender 579/581, brown 583/585.
- **Kitchen chairs** (`12_Kitchen`): 1 x 2. Facing right: red 180, dark 181,
  white 182. Facing left: light 212, white 213, dark 214, red 215.
- **Kitchen tables**: a 3-wide strip with a top row `a`, middle rows `a+16`
  and legs `a+32`, stretched to any length. Light 243, red 246, oak 291.
- **Nine-slice rugs** (`1_Generic`): 3 x 3 pieces from a corner id `c`, rows at
  `c`, `c+16`, `c+32`. Rose 355, blue 403, green 390.
- **Bar stools** (`14_Basement`, 410 and 411): 1 x 2, the seat tile over the
  legs. The `bar-stool-*` prefabs draw the seat as an overlay and only the legs
  as furniture, so a stool placed on a counter's front row draws its seat over
  the counter front and stands on the floor below it.
- Living Room 155 is a 1 x 2 floor lamp, not 1 x 3. Living Room 187 is a single
  cushion, used as the pet bed.
- Always render a sheet region at zoom before adding a prefab. Neighbouring
  blocks often belong to a different object.
