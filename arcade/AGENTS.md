# Arcade Agent Notes

## Local Site

- Site: `gameplan-arcade.localhost` in `~/Projects/benches/frappe-bench`
- Arcade: `http://gameplan-arcade.localhost:8080/g/arcade`
- Use port 8080. Port 8000 serves the production build, which loads sheets from
  `VITE_ARCADE_ASSET_URL`. Without it, the 8 sheets 404 and the game stops with
  `Sprite texture not found`. That is expected until the sheets are published.

## Assets

- **Never commit files from the LimeZu pack.** It is licensed, not ours to redistribute.
  `arcade/pack/` is a gitignored symlink to it. Our own data lives in `arcade/data/`.
- To use a new sheet in the game, add it to `config/packFiles.ts`. The dev server
  serves it from the pack, and `yarn arcade:publish-assets` uploads it to the CDN.
- Avatars are composed at runtime from Character Generator layers
  (`avatar/catalog.ts` lists them). Frames come from the 48x96 grid in
  `avatar/sheet.ts`; there is no atlas file.

## Multiplayer

- Test users on `gameplan-arcade.localhost`, all Gameplan members, password `qwe`:
  `arcade.one@example.com`, `arcade.two@example.com`, `arcade.three@example.com`.
  Log in two of them in separate browser profiles (or isolated contexts) to see
  each other. Both must use the same host: the socket.io namespace is the host
  name, so a player on `192.168.x.x:8080` never meets one on
  `gameplan-arcade.localhost:8080`.
- `yarn arcade:bot` walks a bot around the Common Room as `arcade.two` (chat and
  emotes included). `--user`, `--password` and `--site` override the defaults.
- Presence runs in Frappe's socket.io process: `realtime/handlers.js` at the app
  root loads `realtime/arcade.js`. With `developer_mode` on, edits to
  `arcade.js` apply to the next connection (reload the tab). Edits to
  `handlers.js` need the socketio process restarted.
- The browser runs at 60 fps even as a background tab, so it can be driven from
  devtools: the Arcade component's `game` is reachable through
  `document.querySelector('#app').__vue_app__` in dev builds. Setting the
  player sprite's position teleports; `scene.interact()` presses E.
- Map layer contract, bridge, protocol and interactions (coffee, cat, jukebox,
  boards, elevator, plant, darts, party, Homes): `docs/playable-slice.md`.
- What to build next, and the design decisions already settled: `docs/roadmap.md`.

## Homes

- A Home is composed in the browser from its layout (`maps/home.ts`); the server
  only checks the JSON shape. `homeProblem()` is the single test of whether a
  layout is valid, so run it (or `composeHome`) after changing prefabs, the
  catalog (`maps/homeCatalog.ts`) or the Home size.
- `/g/arcade/home/<user>` opens a Home directly. A test user's Home can be reset
  by clearing `home` on their `GP Arcade Profile`.

## Collection

- Items are granted only by `grant_item` in `gp_arcade_profile.py`, from server
  code. Never whitelist it, and never write `unlocks` rows another way. The
  console command and the lockable-item convention are under "Collection" in
  `docs/playable-slice.md`.
- A lockable item needs its id and hint in `data/lockable-items.json`. Nothing
  else marks an item as locked.
- To lock an item again for a test user, delete their `GP Arcade Unlock` row.

## Seasons

- Seasons are `data/seasons.json`, read by both client and server. Adding a
  season or a Diwali year is a data change; the backend test
  `test_arcade_seasons.py` pins the date boundaries.
- Decorations are baked: after editing `maps/world/decorations.ts`, run
  `yarn build:arcade-map`, which fails if they block a path or an Interactable.
- `/g/arcade?season=<id>` (or `none`) previews a season in dev without granting
  anything. The details are under "Seasons" in `docs/playable-slice.md`.

## Shared plant and question of the day

- The plant's stage, droop and bloom come only from its `waterings` rows. To
  show a stage, rewrite the latest `GP Arcade Plant`'s waterings with past days
  from `bench console` (stage = 1 + distinct days). Walking up to the plant
  reloads it. Backend tests patch `gameplan.arcade.utc_today` instead.
- To start over, delete every `GP Arcade Plant` (its waterings go with it) and
  the cutting rows in `GP Arcade Unlock`. Delete `GP Arcade Answer` rows to
  clear the question.
- `get_question` must never return other people's answers before the player
  has answered that day. `test_arcade_question.py` checks it; keep it passing.

## Darts

- To test a week's result without waiting, insert `GP Arcade Dart Throw` rows
  for last week's days from `bench console` (set `user`, `day`, `week`,
  `number`, `score`), then call `settle_weeks()`. It settles only weeks whose
  Sunday is at least 2 UTC days back. Backend tests patch
  `gameplan.arcade.utc_today` instead.
- To start over, delete every `GP Arcade Dart Throw`, every `GP Arcade Darts Week`
  with `frappe.delete_doc` (so its winners go too), and the `darts:%` rows in
  `GP Arcade Unlock`.
- `observe` for darts needs a `value`. A dart sent without one is ignored.

## Birthdays and anniversaries

- The dates are permlevel 1 on `GP Arcade Profile`. Players read them only
  through `get_dates`. Never add them to boot data, `get_celebrations`' other
  fields or any list; `test_arcade_celebrations.py` checks nobody else can
  read them.
- To throw a party for a test user, set their dates to today from
  `bench console`:
  `frappe.db.set_value("GP Arcade Profile", "arcade.two@example.com", "birthday", "09-30")`
  (`work_anniversary` and `work_start_year` the same way). Walking up to the
  party corner reloads it.
- To start over, set `birthday` and `work_anniversary` back to null and
  `work_start_year` to 0, delete every `GP Arcade Candle`, and delete the
  `birthday:%` and `anniversary:%` rows in `GP Arcade Unlock`.

## Team cat

- The cat's name and pets are `GP Arcade Cat Day` rows, one per player per
  day. To start over (unnamed, no favourite), delete every row. Backend tests
  patch `gameplan.arcade.utc_today`; `test_arcade_cat.py` covers the rename
  limit, the once-a-day pet and the tie-break.
- Where the cat is follows from `Date.now()`, so it can be driven from
  devtools: wrap `Date.now` with an offset to jump to a cycle. The cycle's plan
  is `mulberry32(hash('pet-spot') ^ cycle)`; its first number picks the plan
  (below 0.3 wander, below 0.55 seat, below 0.8 favourite, else bed). A trip
  is decided once per cycle, so jump to a new cycle rather than back.
