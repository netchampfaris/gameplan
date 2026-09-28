# World Map Plan: The Gameplan Office

Plan for growing the single common room into a full hangout world, grounded in the
LimeZu Modern Interiors spritesheets we actually have in
`arcade/pack/`.

## Goals

1. The scene fills the entire available screen — no black bands at any window size.
2. One large map with distinct activity zones, in the spirit of `ARCADE.md`
   (Common Area, Game Room, Event Areas).
3. Every zone is buildable from verified spritesheet assets (inventory below).
4. Keep the generated-map pipeline (`maps/*.ts` → Tiled JSON) as the single source
   of truth; no hand-edited Tiled files.

## Screen-fill rendering

The canvas already resizes to its parent (`Phaser.Scale.RESIZE`), but the map is
only 960x720 at zoom 1, so larger viewports show void.

Two-part fix in `CommonRoomScene.setupCamera()` (works for any map size):

- **Cover zoom**: `zoom = max(1, viewportWidth / mapWidthPx, viewportHeight / mapHeightPx)`
  so the map always covers the viewport; recompute on `Scale.Events.RESIZE`.
- **Bigger map**: at 60x40 tiles (2880x1920 px) the map covers up to ~2880px-wide
  viewports at zoom 1, so cover-zoom only kicks in on very large/portrait screens.

Camera keeps following the player, clamped to map bounds as today.

## Map structure

One Tiled map (`world.json`), 60x40 tiles (48px tiles → 2880x1920 px).
Rooms are separated by interior wall strips (Room Builder wall styles per room)
with 2–3 tile door gaps. Single map keeps future multiplayer presence simple
(everyone in one scene) and lets players see into adjacent rooms.

```
+----------------+----------------------+----------------+
|  Library /     |   Common Room        |  Café /        |
|  Focus  20x20  |   (hub, spawn)       |  Kitchen 20x20 |
+----------------+   20x40 center       +----------------+
|  Conference /  |   column             |  Game Room     |
|  All-Hands     |                      |  20x20         |
|  20x20         |                      |                |
+----------------+----------------------+----------------+
```

The center column is the common room + a plaza strip at the bottom that routes
players to the four corner rooms. Exact rectangles will be tuned visually.

Layer stack (already implemented for the common room):

| Layer | Purpose | Depth |
| --- | --- | --- |
| Floor | per-room floor patterns + painted walls | -30 |
| Decor | rugs, runners, floor decals | -25 |
| Objects Back | furniture (player renders in front) | -10 |
| Objects Front | overlays (pillows, table items) | 10 |
| Collision | invisible, generated from solid prefabs | — |
| Spawn Points / Object Palette | object layers, hidden | — |

## Asset inventory (verified by visual survey)

All sheets are 16 columns x 48px except Room Builder (76 columns). Row ranges
refer to tile rows in each sheet; exact tile IDs get picked with the contact-sheet
workflow used for the common room (`/tmp/arcade-design/contact_sheet.py` approach).

### Room shells — `Room_Builder_48x48.png` (76 cols, 8588 tiles)
- Wall styles, 2 rows tall (top trim + baseboard): wood panel (847–850/923–926, in
  use), light wallpaper (~836–845), brown brick (~999–1008), gray (~1140–1160),
  plus full-height variants for taller walls (851–853/927–929).
- Floors (3x2 seamless swatches, rows 9–33): golden wood planks (1630–1632/1706–1708,
  in use), gray wood, cream tile, checkerboard, brick red, parquet squares,
  carpet weaves in many colors.
- Rugs/runners (cols 49–56): ornate red 3x2 (886–888/962–964, in use), blue
  runners 3x1 (1041–1043), olive/teal/pink rugs, beige 2x2 (1494–1495/1570–1571).
- Stairs, arched entryways, baseboards, "3D wall" cross pieces for partitions.

### Common Room — `2_LivingRoom_48x48.png` (done, v1 in game)
Couches (gray 3x3, brown 3x2), armchairs, fireplace 2x3, bookshelves 6x2/3x2,
floor + table lamps, coffee tables, paintings, plants, pillows, TVs (rows 0–3),
big wooden tables (rows 18–20).

### Game Room — `14_Basement_48x48.png` ⭐ richest activity sheet
- **Ping-pong tables** (blue/green, with nets) rows 12–17
- **Pool/billiards tables** (blue/green felt, balls, cue racks) rows 20–29
- **Foosball-style tables** rows 20–23
- **Arcade cabinets** (multiple colors, lit screens) rows 41–44
- **Bean bags / poufs** rows 43–44; sectional couches rows 0–10
- **Big TV + console media unit** rows 47–49; wall posters, dartboard-ish decor
- Colorful armchairs rows 32–40 for spectator seating

### Café / Kitchen — `12_Kitchen_48x48.png`
Counters and islands, fridges (single/double), stoves, sinks, coffee machines and
small appliances (rows 30–35), dining tables with checkered cloths (rows 19–26),
bar stools and chairs (rows 10–16), shelf units with dishes, food props.
Plus animated extras: `animated_coffee_48x48.png`, canteen counters/fridges in
`3_Animated_objects/`.

### Library / Focus Room — `5_Classroom_and_library_48x48.png`
Tall library bookcases (rows 13–33, gorgeous 2x3+ units), school/reading desks
(rows 0–8), blackboards, computer/checkout stations (rows 10–12), globes,
book stacks, reading lamps. Quiet-zone signage via posters.

### Conference / All-Hands — `13_Conference_Hall_48x48.png` (compact, 12 rows)
Big rounded conference table, lectern/podium, projector screen (large white),
directional meeting chairs, notice boards, water-cooler-ish props, doors.
Generic sheet adds long desks and office chairs if more seating is needed.

### Connective tissue — `1_Generic_48x48.png` (1248 tiles)
Large bordered area carpets (rows 20–29, red/blue/green/purple — instant room
identity), windows + curtains (rows 40–48), interior doors (rows 40–42),
restaurant booths (rows 50–55), office desk pods in many colors (rows 58–65),
stairs + railings (rows 15–19, 55–58), potted plants, vending-style cabinets.

### Optional later zones
- **Music corner** — `6_Music_and_sport_48x48.png`: pianos, grand pianos, guitars,
  harps, drum kits, amps, mics, trophies (rows 0–20; "revamped" set rows 30+).
- **Gym corner** — `8_Gym_48x48.png`: treadmills, weight benches, dumbbell racks,
  yoga balls, mats (rows 0–18; revamped rows 20–33).
- **Art corner** — `7_Art_48x48.png`: easels with canvases, paint buckets, pottery.
- Seasonal events — `15_Christmas`, `11_Halloween`, `10_Birthday_party` sheets
  for the Event Areas concept in `ARCADE.md`.

### Animated objects (Phaser sprites, not tilemap tiles)
`3_Animated_objects/48x48/spritesheets/`: doors (many styles + locked variants),
coffee machine, TVs (`animated_old_tv`, `animated_TV_reportage`), wall pianos,
fireplace chimneys, cuckoo clock, cat. These need a sprite layer keyed to map
anchor points (object layer), separate from the tile pipeline.

## Tileset registry plan

`tiled.ts` currently hardcodes two tilesets. Replace with a generated registry —
sheet list with real pixel dimensions, firstgids computed by accumulation:

Currently registered sheets (Phase 2), firstgids computed by accumulation in the
order below. firstgids will shift as the intermediate sheets (conference_hall,
classroom_library, music_sport) get inserted in later phases; prefabs reference
sheets by name so this costs nothing at the call sites.

| # | Sheet | Tiles | firstgid |
| - | --- | ---: | ---: |
| 1 | room_builder | 8588 | 1 |
| 2 | living_room | 720 | 8589 |
| 3 | generic | 1248 | 9309 |
| 4 | kitchen | 784 | 10557 |
| 5 | basement | 800 | 11341 |

Planned full registry once the remaining zones land (insert between generic and
the existing sheets in this order, which re-flows firstgids):

| # | Sheet | Tiles | firstgid |
| - | --- | ---: | ---: |
| 1 | room_builder | 8588 | 1 |
| 2 | living_room | 720 | 8589 |
| 3 | generic | 1248 | 9309 |
| 4 | kitchen | 784 | 10557 |
| 5 | conference_hall | 192 | 11341 |
| 6 | classroom_library | 544 | 11533 |
| 7 | music_sport | 768 | 12077 |
| 8 | basement | 800 | 12845 |
| 9 | gym | 528 | 13645 |
| 10 | art | 112 | 14173 |

Prefabs reference sheets by name (`gid('basement', 123)`), so firstgids can shift
without touching prefab definitions. Only sheets actually used need to load in
Phaser (preload cost: each PNG is 0.2–1.5 MB).

## Pipeline upgrades

1. **Auto tileset registry** (above) in `tiled.ts`.
2. **Room abstraction** in a new `maps/rooms.ts`:
   `{ rect, floorPattern, wallStyle, doorways: [{edge, offset, width}] }` —
   a wall painter draws partition walls into the Floor layer and leaves door gaps,
   adds wall collision, mirrors of what the common room does manually today.
3. **Per-room layout modules**: `maps/world/commonRoom.ts`, `gameRoom.ts`, `cafe.ts`,
   etc., each exporting placements in room-local coordinates; the world builder
   offsets them into map space. Keeps iteration scoped to one room at a time.
4. **Doorway floor transitions**: simple threshold strip where floor patterns meet.
5. Rename the build entry to `scripts/buildWorldMap.ts` → `maps/world.json`,
   keep `common_room.json` until the scene switches over.

## Build phases

| Phase | Deliverable | Notes |
| --- | --- | --- |
| 0 | Fix remaining common-room render bugs | needs your list of what looks off |
| 1 | Screen-fill camera (cover zoom + resize) | small, ships independently |
| 2 | Pipeline upgrades (registry, rooms, world builder) | no visual change yet |
| 3 | World v1: Common Room (ported) + Game Room + Café | highest fun-per-effort |
| 4 | World v2: Library + Conference Hall + plaza polish | |
| 5 | Animated object sprite layer (doors, coffee, TVs, arcade screens) | new renderer concern |
| 6 | Optional corners (music/gym/art), seasonal event dressing | |

Each room is iterated the same way the common room was: edit layout → 
`yarn build:arcade-map` → reload → screenshot review.

## Decisions (2026-06-07)

1. Map size: **60x40** confirmed.
2. World v1 rooms: **Common Room + Game Room + Café**; Library + Conference in v2.
3. World shape: **single shared map** (one scene, door gaps between rooms).
