# Arcade Map Authoring

Maps are generated from TypeScript, not edited in Tiled. A map is a list of
rooms, and each room is a list of prefab placements. The same code builds the
world map in Node and builds personal Homes in the browser, so nothing in
this folder may use Node-only APIs. The one exception is
`../scripts/buildWorldMap.ts`, which writes the file.

## Files

| File | Purpose |
| --- | --- |
| `tiled.ts` | Tiled JSON types, the tileset registry and the `gid()` / layer helpers. |
| `rooms.ts` | Wallpapers and floors by stable id, and `paintGround()`, which paints room walls, doorways and shadowed floors. |
| `prefabs.ts` | The furniture catalog. Each prefab declares its tiles, footprint, seats, interactable and animated sprite. |
| `compose.ts` | `composeMap()` turns rooms and placements into every map layer. |
| `validate.ts` | `findMapProblems()` checks that every spawn and interactable can be reached on foot. `findDecorationProblems()` checks that a season's decorations take nothing away from the plain map. |
| `world/*.ts` | One layout module per world room: `commonRoom.ts`, `library.ts`, `cafe.ts`. `decorations.ts` holds each season's Common Room decorations. |
| `home.ts` | A Home's layout: `composeHome()`, `homeProblem()` (the single validity check), `parseHome()` and `starterHome()`. |
| `homeCatalog.ts` | What Decorate mode offers, by category. |
| `world.layout.ts` | Puts the rooms on the world map and fails the build if the map is not playable. |
| `design-reference/` | Tile grids pixel-matched from the LimeZu example designs, plus `DESIGN-GRAMMAR.md`. |
| `../scripts/buildWorldMap.ts` | Writes `../data/maps/world.json`, the map the game loads, and `world.<season>.json` for each season. |
| `../scripts/render_map.py` | Draws a map JSON to a PNG for review. |
| `../scripts/analyze_home_design.py` | Pixel-matches an example design PNG into a tile id grid. |

## Iterate

Edit a room in `world/`, then from the repo root:

```sh
yarn build:arcade-map
~/Projects/benches/frappe-bench/env/bin/python arcade/scripts/render_map.py \
  arcade/data/maps/world.json /tmp/world.png --objects
```

Render options: `--collision` tints colliding cells red, `--objects` outlines
interactables in blue and marks spawn points in green, `--crop=x0,y0,x1,y1`
renders only those tiles, `--scale=N` resizes the result.

Then reload `http://gameplan-arcade.localhost:8080/g/arcade`.

## The placement model

```ts
{ prefab: 'armchair-red-left', x: 7, y: 6, id: 'lounge-armchair-east' }
```

- `prefab` is a stable id from `prefabs.ts`. Saved Home layouts store it, so
  rename one only with a migration.
- `x`, `y` are tiles from the room's top-left corner, walls included. The wall
  is rows 0 to 2 and the floor starts at row 3.
- `id` names the interactable. Seats get `<id>-seat`, or `<id>-seat-1`,
  `<id>-seat-2` when the prefab has several. Without an `id` the name is
  `<prefab>-<mapX>-<mapY>`, which changes when the prefab moves, so give an
  `id` to anything other code refers to.
- `label` replaces the prompt for this one placement, e.g. "Play Pong". The
  prompt otherwise comes from the kind's handler in `interactions/`.

Room doorways (`doors`) are also measured from the room's left edge.

## How a prefab lands on the layers

| Prefab kind | Layer | Collides |
| --- | --- | --- |
| `rug` | Decor. Must lie on floor. | No |
| `wall` | Decor. Must hang on a wall. | The wall already does |
| `furniture` | Objects Back. Rows above the footprint go to Above when the floor under them is open, so people can walk behind. | The bottom `footprint` rows, except empty cells |
| `tabletop` | Objects Front, or Above over open floor | No |
| `overlay` (any prefab) | Objects Front, or Above over open floor | No |

The build stops with an error when:

- two tiles land in the same cell of a layer
- furniture stands on a wall, a rug lies on a wall, or wall decor hangs off one
- a spawn point or interactable cannot be reached from `spawn-center`

An interactable counts as reachable when someone standing in the middle of an
open cell is within 40px of it, the same `REACH` the game uses for prompts.
Diagonal cells count, so a seat can be reached past the corner of a table.

A `use` area on something out of reach, such as a board on the wall or a
coffee machine on a counter, grows downward until it touches open floor, so
people can use it from in front.

## Object layers

- `Spawn Points`: point objects at the avatar's feet. `spawn-center` is the
  default.
- `Interactables`: `type` is the kind, `name` is the stable id, and the
  properties are an optional `facing` for seats and an optional `label` that
  overrides the handler's prompt.
- `Animated Props`: one rectangle per prop covering one frame, with `x`, `y`
  at its top-left in pixels. Properties:

  | Property | Type | Meaning |
  | --- | --- | --- |
  | `image` | string | Sheet path relative to the pack root, one row of equal frames |
  | `frameWidth`, `frameHeight` | int | Frame size in pixels |
  | `frames` | int | Frames to loop, counted from the first |
  | `fps` | int | Playback speed |

  The object's `type` is the `PackFiles.props` key. The scene draws each prop as
  a sprite (`world/props.ts`) that sorts with avatars by its bottom edge, and
  `render_map.py` draws frame 0. A prefab gets one by declaring `sprite`; its
  tiles are then all 0 and only give its size.

## Adding things

- **A prefab:** add it to `prefabs` in `prefabs.ts`. Render the sheet region at
  zoom first. Many sheet blocks are not what their neighbours suggest. Reuse
  the builders there before writing tiles by hand: `sideCouch`, `chair`,
  `barStool`, `diningTable`, `borderedRug` and `tabletop` cover most seating,
  tables, rugs and table props.
- **Seating:** the avatar's sit animation faces only left or right. Make the
  main seats of a zone face sideways (side couches, kitchen chairs, armchairs),
  and keep up- or down-facing seats rare.
- **An animated prop:** add the sheet to `PackFiles.props` in
  `../config/packFiles.ts`, then add a prefab with `animated(...)`.
- **A wallpaper or floor:** see `DESIGN-GRAMMAR.md` for how the sheet lays
  them out.
- **A room:** add a module in `world/` and list it in `world.layout.ts`.

To study another example design, run the analyzer on its layer PNGs under
`arcade/pack/6_Home_Designs/` and read the grid it writes to `design-reference/`.
