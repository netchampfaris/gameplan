# Playable slice

A first version of Arcade that is fun for one team. Think Club Penguin for a
private community: you have an avatar, you hang out with teammates in a shared
Common Room in real time, and you have a Home you decorate that others can
visit. It is independent of Gameplan activity (no posts, no Spaces) for now.

## What the slice contains

1. **A lively Common Room.** Compact, dense and warm, in the style of the
   LimeZu example designs. It has distinct zones, wall decor, animated props and
   things to use.
2. **Presence.** Everyone in a room sees everyone else move in real time, with
   name tags, speech bubbles, emotes and sitting.
3. **Avatars.** Each person builds a look from the Character Generator layers
   (body, eyes, outfit, hairstyle, accessory). The first visit asks for one.
4. **Homes.** Each person has one small room they decorate: floor, wallpaper
   and furniture from a catalog, placed on the grid. Others visit through the
   elevator in the Common Room, or by link.
5. **Traces.** A guestbook in every Home and a notice board in the Common Room,
   so a visit counts even when nobody else is online.

## Words

See `../CONTEXT.md`. New terms: **Home**, **Guestbook**, **Notice Board**,
**Decorate mode**.

## Architecture

```
frontend (Vue)                  arcade/ (Phaser + HUD)                  backend
─────────────                   ──────────────────────                  ───────
Arcade route ── mounts ──▶ Arcade.vue ──▶ ArcadeGame (Phaser)
                           │  HUD (Vue)   ├─ scenes: Common Room, Home
                           │   ▲    │     ├─ avatars, bubbles, emotes
                           │   │ bridge   └─ ArcadeNet ──socket.io──▶ realtime/handlers.js
                           │   │    ▼                                  (presence, in memory)
                           └── frappe-ui resources ─────────────────▶ GP Arcade Profile
                                                                       GP Arcade Note
                                                                       GP Arcade Plant
                                                                       GP Arcade Answer
                                                                       GP Arcade Candle
                                                                       GP Arcade Cat Day
```

- **Real-time state never touches Python.** Frappe's socket.io server loads
  `realtime/handlers.js` (at the app root) for every connection. Arcade presence (join,
  move, say, emote, sit, leave) is relayed between sockets in memory, scoped to
  the site's namespace and a socket.io room per Arcade room.
- **Persistent state is ordinary doctypes.** Avatar look and Home layout are on
  `GP Arcade Profile` (one per user, named by user). Guestbook entries and
  notice-board notes are `GP Arcade Note`. The shared plant is
  `GP Arcade Plant`, answers to the question of the day are
  `GP Arcade Answer`, candles on a celebration's cake are
  `GP Arcade Candle` and the team cat's name and pets are
  `GP Arcade Cat Day`; each is read and written only through its own
  whitelisted methods. Use standard document APIs and frappe-ui resources. Do not add module-level endpoints to `gameplan/api.py`.
- **`arcade/` does not import from `frontend/src`.** `Arcade.vue` passes the
  Gameplan socket and the session user into `ArcadeGame`.
- **Vue owns the HUD, Phaser owns the world.** Chat input, emote bar, avatar
  picker, home directory, decorate catalog and guestbook are Vue components
  styled with frappe-ui. They talk to the game through one typed bridge, not
  through globals.

## Contracts between the parts

### Map → game

- Tileset images: `config/packFiles.ts` → `PackFiles.tilesets`, keyed by Tiled
  tileset name. `maps/tiled.ts` reads image paths from there. The scene loads
  every tileset a map declares, so adding a sheet needs no scene change.
- Layers: `Floor`, `Decor`, `Objects Back`, `Objects Front`, `Above`,
  `Collision`, `Spawn Points`. `Above` holds the upper tiles of tall furniture
  that an avatar can walk behind (bookshelf tops, plant leaves).
- Depths: Floor -30, Decor -25, Objects Back -10, Objects Front 10. Avatars and
  animated props sort by their bottom edge (depth = y in pixels). Above is
  100 000. A season's light is 150 000. Name tags and speech bubbles go over
  everything (200 000).
- `Interactables` object layer: read by `world/interactables.ts`. Object
  `type` is the kind (`seat`, `coffee`, `noticeboard`, `elevator`, `arcade`,
  `jukebox`, `pet`, `plant`, `darts`), `name` is a stable id, and the optional properties are
  `facing` (seats) and `label`.
- `Animated Props` object layer: read by `world/props.ts`, which queues the
  sheets during preload and adds the sprites after the map is created.

### Real-time protocol

Owned by `arcade/net/` (client) and `realtime/arcade.js` (server). Types and
event names are in `net/protocol.ts`; the server mirrors them in plain JS.

- **Rooms.** Room ids are `common` or `home:<user>`. A socket is in at most one
  Room. The server keeps who is where in memory, per site namespace.
- **Who may join.** On the first join the server calls
  `GP Arcade Profile/get_player` with the socket's session. Guests and Gameplan
  guests are refused. The name shown comes from the server, not the client.
- **Poses.** A pose is `{x, y, facing, state}`: feet position in map pixels,
  `down | left | right | up`, and `idle | walk | sit`. The client sends at most
  10 per second while moving, sends at once when state or facing changes, and
  always sends the final position. Remote Avatars are drawn 120 ms in the past
  and blended between samples; a jump over 300 px is a teleport.

| Client sends (ack) | Payload | Server sends to others |
| --- | --- | --- |
| `arcade:join` (ack) | `{room, appearance, pose}` | `arcade:joined` Occupant |
| `arcade:move` | Pose | `arcade:moved` Pose + `{id}` |
| `arcade:say` | `{text}` | `arcade:said` `{id, text}` |
| `arcade:emote` | `{emote}` | `arcade:emoted` `{id, emote}` |
| `arcade:appearance` | `{appearance}` | `arcade:appearance` `{id, appearance}` |
| `arcade:hold` | `{item}` (`coffee` or null) | `arcade:held` `{id, item}` |
| `arcade:use` | `{target, value?}` (an Interactable id) | `arcade:used` `{id, target, value?}` |
| `arcade:leave` | `{}` | `arcade:left` `{id}` (also on disconnect) |
| `arcade:home` | `{}` (the owner saved their Home) | `arcade:home` `{user}` |
| `arcade:rooms` (ack) | `{}` | nothing |

The join ack is `{ok: true, self, occupants}` or `{ok: false, error}`. The rooms
ack is `{ok: true, rooms}` or `{ok: false, error}`, where `rooms` counts distinct
people per Room id and leaves out empty Rooms. The server relays `arcade:home`
only from the owner, standing in their own Home, to the others there; they
reload the Home from the server. Joining a new Room leaves the old one, and a
join reply that arrives after the player has moved on is ignored. An
Occupant is a pose plus `{id, user, fullName, appearance, holding}`; `id` is the socket
id, so one person in two tabs is two Occupants. Nothing is echoed back to the
sender. The client rejoins its Room after a reconnect.

Limits, per socket: say is trimmed to 140 characters, 1 per second with a burst
of 3; emotes 2 per second; moves 20 per second; joins and appearance changes 1
every 2 seconds; hold and use 1 per second with a burst of 3; `arcade:home` 1
every 2 seconds with a burst of 3; `arcade:rooms` 1 per second with a burst of 5. Anything malformed
is dropped.

`holding` is kept on the server so a late joiner sees the cup; the holder's own
game sends `null` after 60 seconds. `use` is a moment with nothing kept: the
server relays it and each game plays it (hearts, music, a dart) through the
handler's `observe`. Someone who joins later does not see it. `value` is an
optional whole number from 0 to 999, relayed as it is; darts sends the score.

### HUD ↔ world (the bridge)

`bridge.ts` is the only link. `Arcade.vue` makes one `ArcadeBridge` and hands it
to the game with the `ArcadeNet`.

- The game writes `bridge.state` (reactive): `connection`, `error`, `room`,
  `occupants` (self first, each with its appearance), `prompt` (`{label,
  target}`: e.g. "Sit" and the id of the Interactable in reach), `plant` (the
  shared plant's status, while its Room is open),
  `keyboard`, `appearance`, and `board` (the Notice Board or Guestbook the
  player opened) with `boardRevision` (goes up when someone else in the Room
  changes a board). For Homes: `home` (whose Home the player is in),
  `directoryOpen` (the elevator's panel), `decorate` (the draft while its
  owner decorates), `travelling` (a Home is loading) and `notice` (an error
  the HUD shows once, then clears). For darts: `darts` (the id of the darts
  line whose dialog is open) and `lastDart` (`{fullName, score}`, the last dart
  someone else in the Room threw). For the party corner: `party` (`{target,
  celebrations}` while its Room is open on a day with a celebration, else
  null). For the team cat: `cat` (`{target, status}` while the Common Room is
  open, else null).
- The HUD calls `say(text)`, `emote(id)`, `setAppearance(look)`,
  `setKeyboardOwner('game' | 'hud')`, `closeBoard()`, `notesChanged(target)`,
  `travel(destination)`, `decorate(command)`, `dartThrown(target, score)` and
  `catRenamed(target, status)`; the game listens on
  `bridge.commands`.
- While the HUD owns the keyboard (chat focused, customizer, a board, the Home
  directory, darts, "Your dates", the cat's name or Decorate mode open), Phaser's keyboard is
  disabled, so typing never moves the Avatar. The HUD can take the keyboard
  before the Room exists (the welcome customizer does), so each Room applies
  `bridge.state.keyboard` when it connects, not only when it changes.

Keys: arrows or WASD to walk, Shift to run, E to use what is in reach, Enter to
chat (Enter sends, Esc leaves), 1 to 8 for emotes.

### Interactions

`interactions/registry.ts` maps an Interactable kind to a handler:

```ts
registerInteraction('coffee', {
  label: 'Get coffee',
  interact(target, { scene, player, bridge, net }) { /* ... */ },
})
```

Register it in `interactions/index.ts`. The Room shows "E  <label>" for the
nearest Interactable within 40 px of the feet whose kind has a handler, and
calls `interact` on E. An Interactable's own `label` property overrides the
handler's. `seat` is the first handler: it sits the player on the seat's
footprint, facing its `facing`, and any movement key stands them up.

A handler can also have `setup(target, context)`, run once when the Room
starts, which returns `{update?, destroy}` for things that live in the Room
(the cat, the jukebox's notes, the shared plant). A runtime can change
`target.label`, and the prompt shows the new label. A handler that calls `net.use(target.id, value?)` gets
`observe(target, use, context)` in every other game in the Room, where `use` is
`{actor, fullName, value}`: the actor's Avatar and name (null if they are not
in this game's Room yet) and the number sent, or null.

| Kind | What E does |
| --- | --- |
| `coffee` | A cup in the hand for 60 s, seen by everyone (`arcade:hold`) |
| `pet` | Hearts over the cat and the petter. The first pet of a player's day counts toward the team cat's favourite person; the other games reload the card. The cat lives in `objects/Cat.ts` |
| `jukebox` | Notes rise from the jukebox for 20 s; Avatars within 160 px show a music emote. No sound |
| `noticeboard`, `guestbook` | Opens `hud/NoteBoard.vue`; pinning or removing a note, or answering the question of the day, tells the Room to reload |
| `plant` | Waters the shared plant once a day; drops fall on it in every game in the Room |
| `darts` | Opens `hud/Darts.vue`; each dart lands on the wall board in every game in the Room |
| `party` | On a day with a celebration, adds your candle to each cake you have not candled; the other games reload and show it. No prompt on other days |
| `elevator` | Opens the Home directory (`hud/HomeDirectory.vue`) |
| `door` | The doormat in every Home: back to the Common Room, at the elevator |

Where the cat is has no server state. Time is cut into 60 s cycles; each
cycle's plan comes from a random generator seeded with the cycle number and the
Interactable id, so every game draws the cat in the same place, give or take
clock skew. It never collides with anything. The plans, and what the server
keeps for the Common Room's cat, are under "Team cat" below.

Notes are `GP Arcade Note` documents: `board` (Notice Board or Guestbook),
`home` (the Guestbook's owner) and `message` (at most 280 characters). Anyone
who can enter the Arcade reads and posts them; nobody edits one. The author,
the Guestbook's owner and System Managers delete. Reading your own Guestbook
sets `guestbook_read_at` on your GP Arcade Profile to the newest note's time;
while in your Home you see how many notes are newer than that.

### Rooms

`scenes/RoomScene.ts` is the base: it loads a map (a URL or in-memory Tiled
data), its tilesets and props, the player, remote Avatars, and wires the bridge
and the net. A Room is a subclass that names its default room id and map, like
`CommonRoomScene`; scene data `{room, map, spawn}` overrides the defaults when
starting a scene. `replaceMap(data)` swaps the map in place, keeping the player
and the presence connection.

`ArcadeGame` adds both scenes once Phaser boots and starts neither until it has
a destination: `mount(parent, services, destination)` and then
`bridge.travel({kind: 'common', spawn?} | {kind: 'home', user})`. Loading a Home
goes through `services.homes` (`hud/useHomes.ts`, GP Arcade Profile's
`get_home`); a Home that cannot open leaves the player where they were, or in
the Common Room on a deep link, with a notice.

**Camera.** Every Room zooms by a whole number so that about 14 to 22 tiles fit
across (and at least 7 down), with `roundPixels`. A Room smaller than the
screen is centred over the dark background by padding the camera bounds in
whole screen pixels. Decorate mode frames the whole Room beside the HUD panel
instead of following the player; there, a Room too big for a whole-number zoom
shrinks by whole screen pixels per tile, so tiles still meet without seams.

### Homes

A Home is `home:<user>`, 14 x 13 tiles with a 3-tile wall, composed in the
browser from its layout by `maps/home.ts` (`composeHome`, through the same
`composeMap` as the Common Room). Its door is a gap in the bottom wall with a
doormat (`door` Interactable). The layout is JSON on `GP Arcade Profile.home`:

```json
{
  "wallpaper": "cream",
  "floor": "golden-wood",
  "items": [{ "prefab": "bed-double-blue", "x": 1, "y": 2 }, { "prefab": "guestbook", "x": 9, "y": 8 }]
}
```

`x, y` is the prefab's top-left tile. At most 60 items; wallpaper, floor and
prefab ids come from `maps/rooms.ts` and `maps/prefabs.ts`. The server checks
the shape; the client is the judge of placement: `homeProblem(home)` runs
`composeMap` and `findMapProblems`, so a layout that saves is one that
composes. `parseHome` drops items it cannot place, and a person who never
saved gets `starterHome(user)`, picked from a few looks by their user id. Every
Home keeps exactly one guestbook; it can move but not go.

- **Getting there.** The elevator in the Common Room opens "Visit homes": your
  own Home first, then everyone else by how many people are there, with a
  search. `/g/arcade/home/<user>` opens a Home directly. The address follows the
  player (`router.replace`), and changing it moves the player.
- **Decorate mode** (owner only, from the place pill at the top). The panel
  (`hud/DecoratePanel.vue`) has the catalog by category (`maps/homeCatalog.ts`),
  drawn from the tiles themselves, and wallpaper and floor swatches. The held
  item follows the pointer on the grid, green where it fits and red with the
  reason where it does not (overlap, off the floor, wall decor off the wall,
  blocking the doorway or a path). Click to place; click a placed item to pick
  it up; Esc puts it back, Delete or Backspace removes it. Save stores the
  layout and tells visitors (`arcade:home`); Cancel asks before throwing away
  changes. The Avatar does not move while decorating.

### Collection

Later features (seasons, the plant, the puzzle, darts, birthdays) give players
Home items through this, and only this. Terms are in `../CONTEXT.md`
(Collection, Locked item, Unlock, Source); the choices behind them are under
Decisions in `roadmap.md`.

**Making an item lockable.** Add the prefab to `maps/prefabs.ts`, list it in a
category in `maps/homeCatalog.ts`, then add its id and a hint to
`data/lockable-items.json`:

```json
{ "pumpkin-lantern": { "hint": "Visit during Halloween" } }
```

The hint is short and plain, with no final period: the catalog shows
"Pumpkin lantern is locked. Visit during Halloween." Both the catalog and the
server read this file, and a test checks that every id in it is a prefab.
Items not in the file are free.

**Granting an item.** Server code, including scheduled jobs, calls:

```python
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import grant_item

grant_item(user, "pumpkin-lantern", "season:halloween-2026")  # True if newly unlocked
```

- It throws a ValidationError for an item not in `lockable-items.json` or a
  source that is not `kind:detail` (lowercase kind; letters, digits and hyphens
  after the colon; at most 140 characters).
- An item already in the user's Collection, from any source, returns False and
  changes nothing, so calling it again is safe.
- It creates the user's `GP Arcade Profile` if they have none, and locks the
  row so two grants at once add the item once.
- It is not whitelisted. A feature's own whitelisted method decides whether
  the player earned the item, then calls it. Unlocks are rows in the
  `unlocks` table (`GP Arcade Unlock`: item, source, unlocked_at); a client
  save that adds, changes or removes one is refused.

**What the player sees.** `hud/useArcadeProfile.ts` loads `unlocks` with the
profile, and `DecoratePanel.vue` grays out every lockable item not in it. After
the commit, `grant_item` sends `arcade:item_unlocked` `{item, source}` to the
user's sockets; `hud/useUnlockNotices.ts` shows the toast "New item: <name>"
and reloads the profile, so the item unlocks in open tabs. The server does not
check that placed items are unlocked.

To try it from the console:

```
bench --site gameplan-arcade.localhost execute \
  gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile.grant_item \
  --kwargs "{'user': 'arcade.one@example.com', 'item': '<id>', 'source': 'test:console'}"
```

**Today.** Daily features send the player's local date: `localDate()` in
`util/today.ts` (`YYYY-MM-DD`, local time). The server checks it with
`player_today(value)` in `gameplan/arcade.py`, which returns a `date` and
throws a ValidationError for a bad format or a date more than one day from the
server's UTC date. Use the returned date for the day's puzzle, throws or
watering, and put it in the source: `puzzle:2026-10-03`.

### Seasons

A Season decorates the Common Room and gives everyone who enters the Arcade
during it a few Home items. The list is `data/seasons.json`, read by both the
client (`config/seasons.ts`) and the server (`gp_arcade_profile.py`):

```json
{
  "halloween": { "name": "Halloween", "dates": { "from": "10-20", "to": "11-01" }, "items": ["glowing-pumpkin", "witch-cauldron"] },
  "diwali": { "name": "Diwali", "years": { "2026": { "from": "11-05", "to": "11-12" } }, "items": ["glowing-candles"] }
}
```

- **Dates.** Ranges are inclusive `MM-DD`. `dates` repeats every year; `years`
  is for a season that moves, by the year it starts in, and a year not listed
  has no season. A range whose `to` comes before its `from` (Christmas,
  `12-15` to `01-01`) ends the next year and keeps the year it started in.
  `seasonOn(day)` and `active_season(day)` must agree; the backend test pins
  the boundaries. Seasons do not overlap. Diwali needs a new line each year.
- **Items.** Each item is a prefab in a catalog category (the "Seasonal"
  category in `maps/homeCatalog.ts` is built from this file) and is in
  `data/lockable-items.json` with the hint "Visit during <name>".
- **Granting.** When the Arcade opens during a season, `hud/useSeason.ts` calls
  GP Arcade Profile's `claim_season_items(today)` with `localDate()`. The
  server checks the date with `player_today`, works out the season itself and
  grants its items with the Source `season:<id>-<year>` (`season:christmas-2026`
  on 1 January 2027). Every visit claims again; `grant_item` makes that safe.
- **Decorations.** `maps/world/decorations.ts` lists each season's placements.
  `yarn build:arcade-map` bakes one map per season, `data/maps/world.<id>.json`,
  and fails if `findDecorationProblems` finds a cell the decorations cut off, a
  blocked spawn point, or a blocked cell someone uses an Interactable from. The
  season is picked once per session and passed to the scenes as
  `services.season`; the Common Room loads that season's map and lays a soft
  tint (`seasonLight`) over the room at `Depth.LIGHT`.
- **Preview.** In development, `/g/arcade?season=halloween` (or `diwali`,
  `christmas`, `none`) shows a season's decorations and grants nothing.
  Production builds drop it.

### Shared plant

One plant for the whole Arcade, beside the Notice Board in the Common Room
(the `shared-plant` prefab, `kind: plant`). Terms are in `../CONTEXT.md`
(Shared plant, Cutting).

- **State.** Each cycle is one `GP Arcade Plant` document, named by its cycle
  number, with `species`, `started_on`, `bloomed_on` and a `waterings` table
  (`GP Arcade Plant Watering`: user, day, watered_at). Only System Managers read
  the doctype.
- **Methods.** `get_plant(today)` and `water_plant(today)` on GP Arcade Plant,
  both with `localDate()`. Both return `{cycle, species: {id, name, item},
  stage, stages, drooping, bloomed, watered_today: [{user, full_name}],
  watered_by_me}`. `water_plant` refuses a second watering on the same day and
  any watering while the plant is in bloom.
- **Rules.** The stage is 1 plus the number of different days it was watered,
  up to 5. It droops after 3 days with no watering; a new plant counts from the
  day the last one bloomed; a plant in bloom never droops. At stage 5 it blooms:
  `water_plant` grants the species' cutting to everyone who watered that cycle
  (`plant:<cycle>`). The first watering on a later day starts the next cycle
  with the next species in `data/plants.json`.
- **Species.** `data/plants.json` lists each species' id, name and cutting (a
  prefab id). Each cutting is a Home item in the Plants category and is in
  `data/lockable-items.json`.
- **Drawing.** `objects/SharedPlant.ts`: the animated sprout at stage 1, then
  grocery-sheet plants, and the species' flowering plant at stage 5. A drooping
  plant is tinted dry and leans. The plant loads the grocery sheet itself,
  because the Common Room map does not use it.
- **In the game.** `interactions/plant.ts` loads the plant when the Room opens
  and whenever the player walks up to it, so the card is fresh. It writes
  `bridge.state.plant`, and the HUD shows `hud/PlantCard.vue` (stage, a note,
  who watered it today) above the prompt. Watering shows drops and tells the
  Room through `net.use`; the other games show drops and reload. The prompt
  says "Watered today" or "In bloom" when watering would do nothing.

### Question of the day

One question at the top of the Notice Board (not the Guestbook), from
`hud/QuestionOfTheDay.vue`.

- **Questions.** `data/questions.json`, 60 of them. The server picks one from
  the player's date (`day.toordinal() % len`), so everyone on the same day gets
  the same question.
- **State.** One `GP Arcade Answer` per player per day, named `<day> <user>`:
  `user`, `day`, `question` (a copy of the text) and `answer` (at most 140
  characters). Only System Managers read the doctype.
- **Methods.** `get_question(today)` and `answer_question(today, answer)` on
  GP Arcade Answer. Both return `{day, question, answer, count, answers}`.
  `answers` (user, full name, appearance, answer, oldest first) is empty until
  the player has answered that day; before that the reply has only `count`.
  Answering again on the same day changes the answer.
- **In the HUD.** Before answering, the player sees the question, a field and
  how many people answered. After, everyone's answers with names, and Edit on
  their own. Answering calls `notesChanged`, so others with the board open
  reload it.

### Daily puzzle

A 10 x 10 nonogram in the Common Room's arcade corner, on the middle of its
three cabinets (the `puzzle-cabinet` prefab, `kind: puzzle`). Terms are in
`../CONTEXT.md` (Daily puzzle).

- **Puzzles.** `data/puzzles.json`, 41 of them, each `{item, rows}`: rows of
  `#` and `.`, the silhouette of a Home item. `yarn build:arcade-puzzles`
  writes the file from the items' pack tiles and drops any silhouette that line
  logic cannot solve or that has two answers; `--sheet` draws a review sheet.
  The order is the order of the days. Every item is in the Puzzles category of
  the Decorate catalog and in `data/lockable-items.json`.
- **Picking.** Puzzle #1 is September 1, 2026, and the number goes up by one a
  day. The server takes `(number - 1) % len` from the player's date.
- **State.** One `GP Arcade Puzzle Result` per player per day, named
  `<day> <user>`: `user`, `day`, `item`, `seconds`, `mistakes`. Only System
  Managers read the doctype. A puzzle in progress lives only in the browser's
  localStorage under `arcade:puzzle:<user>:<day>` (`hud/puzzleProgress.ts`).
- **Methods.** `get_puzzle(today)` and `submit_puzzle(today, grid, seconds,
  mistakes)` on GP Arcade Puzzle Result, both with `localDate()`. Both return
  `{day, number, rows, item, result, count, results}`. `item`, `result` and
  `results` (user, full name, appearance, seconds, mistakes, fastest first)
  are empty until the player has solved it that day; before that the reply has
  only `count`. `submit_puzzle` is POST only. It refuses a grid that is not the
  answer and a second result on the same day, then grants the item
  (`puzzle:<day>`).
- **In the HUD.** `interactions/puzzle.ts` sets `bridge.state.puzzleOpen`, and
  the HUD mounts `hud/DailyPuzzle.vue`, so the puzzle loads fresh each time.
  `hud/PuzzleBoard.vue` draws the grid and clues: a click uses the chosen tool
  (Fill or Mark empty), a right click always marks, and a drag repeats the
  action. A wrong fill shows at once and adds a mistake. The clock starts on the
  first move. A solved grid is sent at once; on success the dialog shows the
  item's picture, the player's time and mistakes, everyone's results and Copy
  result. If sending fails, the grid stays solved and a Send result button
  tries again.

### Darts

A dartboard on the Common Room's top wall, above the darts line (the
`darts-line` prefab at (24, 5), `kind: darts`). Terms are in `../CONTEXT.md`
(Darts, Darts line, Darts week, Weekly winner, Darts trophy).

- **Board.** The pack has no dartboard, so `objects/Dartboard.ts` draws one on
  a canvas and hangs it on the first wall above the line, found from the
  Collision layer. A strip of tape marks the line. It keeps the last 3 darts
  thrown and floats each score over the thrower. `world/dartboard.ts` holds
  the geometry both boards share: sector order, ring radii, `scoreAt(point)`
  and `pointFor(score)`, which picks a spot that scores `score`.
- **Aim.** `hud/dartAim.ts`. The first press starts a marker sweeping across
  the board, the second locks it and starts one sweeping up and down, the third
  locks that and throws. The dart lands where they cross, plus a small random
  wobble. Space, a tap on the board and the dialog's button all press. The
  event's own time stamp decides where the marker stopped.
- **State.** One `GP Arcade Dart Throw` per dart, named `<day> <user> <n>`:
  `user`, `day`, `week` (ISO, `2026-W40`, of the local date), `number` (1 to 3)
  and `score`. One `GP Arcade Darts Week` per settled week, named by the week,
  with `top_score` and the `winners` child table (`GP Arcade Darts Winner`).
  Only System Managers read either doctype.
- **Methods.** `get_darts(today)` and `throw_dart(today, score)` on GP Arcade
  Dart Throw, both with `localDate()`. Both return `{day, week,
  throws_per_day, today, standings, last_week}`. `today` is the player's
  scores for the day. `standings` is the week's players (user, full name,
  appearance, wins, total, throws), best total first, then fewer darts.
  `last_week` is `{week, settled, top_score, winners}` or null. Until the week
  is settled its winners are the leaders so far. `throw_dart` is POST only. It
  refuses a score no dart can make and a 4th dart on the same day.
- **Settling.** `settle_weeks` on GP Arcade Darts Week runs daily. It settles
  each week that has thrown darts, no record yet, and a Sunday at least 2 UTC
  days ago: it records everyone with the best total and grants each the Darts
  trophy (`darts:<week>`). A week whose best total is 0 has no winners.
- **In the HUD.** `interactions/darts.ts` sets `bridge.state.darts`, and the HUD
  mounts `hud/Darts.vue` (the board is `hud/DartBoard.vue`, in SVG), so it
  loads fresh each time. After the server records a dart, the dialog tells the
  game, which throws it at the wall board and sends `net.use(line, score)`.
  The others see it land, get a toast ("Arcade One scored 60"), and reload the
  leaderboard if their dialog is open.

### Birthdays and anniversaries

A party corner in the Common Room, beside the long table (the `party-table`
prefab at (8, 12), `kind: party`). Terms are in `../CONTEXT.md` (Celebration,
Celebrant, Candle, Party corner).

- **Dates.** `birthday` and `work_anniversary` (`MM-DD`) and
  `work_start_year` (optional) on `GP Arcade Profile`, empty by default, at
  permlevel 1 so only System Managers can read them through the standard APIs.
  `get_dates` and `set_dates` read and write the session user's own. The HUD's
  cake button opens `hud/DatesPanel.vue` ("Your dates"). `User.birth_date` is
  never read.
- **Today.** `celebrations_on(day)` finds everyone whose date is `day`; a
  February 29 date also matches February 28 in other years. `years` is
  `day.year - work_start_year` when that is above 0.
- **Candles.** One `GP Arcade Candle` per person per celebration per year,
  named `<occasion> <year> <celebrant> <user>`: `celebrant`, `occasion`
  (`birthday` or `anniversary`), `year`, `user`. Only System Managers read the
  doctype.
- **Methods.** `get_celebrations(today)` and `add_candle(today, celebrant,
  occasion)` on GP Arcade Candle, both with `localDate()`. Both return
  `{day, celebrations}`, each `{celebrant, full_name, occasion, years,
  candles, candled, candles_from}`. `candles_from` (user, full name,
  appearance, added_at) is filled only for the celebrant. `add_candle` is POST
  only and refuses a second candle and a celebration that is not today.
- **Unlocks.** `claim_celebration_items(today)` on GP Arcade Profile grants the
  Birthday cake (`birthday:<year>`) or the Anniversary plaque
  (`anniversary:<year>`) on the celebrant's day. `Arcade.vue` calls it when the
  Arcade opens, after the profile has loaded, and after "Your dates" is saved.
- **Drawing.** `objects/PartyCorner.ts`: the pack's red cake with its candle
  painted out, a red and a blue balloon tied to the table, a line per
  celebration above them, the candles round a ring on the cake (up to 12), and
  a count under the plate. It loads the birthday sheet and the balloons itself.
  On a day with nothing to celebrate it draws nothing.
- **In the game.** `interactions/party.ts` loads the party when the Room opens
  and whenever the player walks up to it. It writes `bridge.state.party`, and
  the HUD shows `hud/PartyCard.vue` (each title, its count, and for the
  celebrant, who added candles) above the prompt. The prompt says "Add a
  candle", "Add candles" or "Candle added". Adding tells the Room through
  `net.use`; the other games reload, and new candles pop up on the cake.

### Team cat

The cat on the Common Room's pet bed (`pet-spot`, `kind: pet`). Terms are in
`../CONTEXT.md` (Team cat, Cat name, Favourite person). A cat on a pet bed in a
Home moves the same way but keeps no name and counts no pets.

- **State.** `GP Arcade Cat Day`, one per player per local day, named
  `<day> <user>`: `user`, `day`, `petted_at` (the first pet that day),
  `cat_name` and `named_at` (a rename that day). Only System Managers read the
  doctype. The cat's name is the `cat_name` with the latest `named_at`; with no
  rows it is unnamed ("the cat"). To reset it, delete every row.
- **Methods.** `get_cat(today)`, `pet_cat(today)` and `name_cat(today,
  cat_name)` on GP Arcade Cat Day, all with `localDate()`; `pet_cat` and
  `name_cat` are POST only. All three return `{name, named_by, named_today,
  favourite, petted_today}`, with `named_by` and `favourite` as
  `{user, full_name}` or null. `name_cat` collapses spaces, takes at most 24
  characters and refuses a second rename by the same player on the same day.
  `pet_cat` counts once a day and changes nothing after.
- **Favourite person.** Whoever has petted it on the most days. On a tie, the
  one whose last counted pet is earlier, then by user.
- **Plans.** Each 60 s cycle: wander to a free tile within 3 tiles and back
  (0.3), nap on a seat (0.25), sit beside the favourite person (0.25), or stay
  on the bed. Seats and the favourite must be within 12 steps of the bed; the
  way there is a search over the Collision layer, straightened where nothing is
  in the way. The cat leaves 2 to 6 s into the cycle and decides then, from
  presence: the first free seat counting round from one the cycle picks, or the
  tile beside the favourite person if they are in the Room. It is back on its
  bed a second before the cycle ends.
- **Seats.** A seat is taken when someone sits with their feet on it. A cat
  napping on a seat is drawn on the cushion and cannot be petted, so "Sit"
  shows there. When someone sits on its seat, it walks back to its bed.
- **Favourite.** Beside its favourite person, it sits facing them with a heart
  over it every 3.2 s.
- **In the game.** `interactions/pet.ts` loads the cat when the Room opens and
  whenever the player walks up to it. It writes `bridge.state.cat`, and the HUD
  shows `hud/CatCard.vue` (the name, who named it, the favourite person and a
  Rename button) above the prompt, which says "Pet <name>" once it has one.
  `hud/CatNameDialog.vue` renames it. A counted pet sends `net.use` with 1 and
  a rename with 2; the other games reload the card.

## Order of work

1. World redesign (map data, props, interactables) and multiplayer foundation
   (scene structure, avatars, presence, chat, emotes, sitting) in parallel.
2. Homes, guestbook, notice board, elevator and the remaining Common Room
   interactions, built on both. (Done.)
3. Two-person browser playtest, then polish.
