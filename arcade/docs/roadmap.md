# Roadmap

What comes after the playable slice (`playable-slice.md`). Chosen on 2026-09-30.

A remote team is rarely online together, so most visits happen when nobody
else is in the room. Every feature here stays fun for a player who is alone.

## Features

- **Shared plant.** One plant for the whole Arcade. It grows a stage on each
  day someone waters it and droops after a few days without water. It never
  dies.
- **Question of the day.** A prompt on the Notice Board. You see other people's
  answers only after you post your own.
- **Daily puzzle.** Wordle-style: everyone gets the same puzzle each day and
  compares results.
- **Darts.** 3 throws a day, with a weekly leaderboard on the wall.
- **Team cat.** It wanders on a clock every player shares, so everyone sees it
  in the same place, and players can pet it. The team names it, it naps on
  empty chairs, and it remembers who pets it most.
- **Birthdays and work anniversaries.** A cake appears in the room, and anyone
  who visits can add a candle.
- **Seasonal decorations.** The room changes for Halloween, Diwali and
  Christmas. The pack has `11_Halloween` and `15_Christmas` sheets.
- **Collection.** What the other features unlock. See the table below.

## Decisions

- **No currency.** Features unlock items into a Collection instead. There is
  nothing to balance and no inflation.
- **A day starts at each player's local midnight**, as in Wordle. This applies to
  the plant, the question, the puzzle and darts. Two teammates can briefly be on
  different days.
- **The daily puzzle is a pixel nonogram.** Its solution is a pack item, and
  solving the puzzle unlocks that item. The puzzles are a reviewed set, and
  the date picks the day's puzzle.
- **Darts before mini-golf.** Mini-golf needs a course and ball physics, which
  is several times the work.
- **Birthdays and anniversaries are opt-in** on `GP Arcade Profile`, as day and
  month only. Do not read `User.birth_date`: people never agreed to share it,
  and it has no join date.
- **Unlocks are a child table on `GP Arcade Profile`** (`GP Arcade Unlock`:
  item, source, time). The client already loads the profile, so unlocks arrive
  in the same request. A separate doctype would need its own permissions and
  a second request. A client cannot add or remove rows: `validate` refuses any
  change to them unless `grant_item` made it.
- **One list of lockable items, shared by client and server.**
  `arcade/data/lockable-items.json` maps a prefab id to its hint. The catalog
  imports it and `grant_item` reads it, so an id that is not in the list cannot
  be granted. Items not in the list are free.
- **The server does not check that placed items are unlocked.** Cheating is
  harmless, and a Home that already holds an item stays valid when that item
  later becomes lockable. Only the catalog stops a player picking up a locked
  item.
- **A source is `kind:detail`**, lowercase kind, then letters, digits and
  hyphens: `season:halloween-2026`, `puzzle:2026-10-03`, `darts:2026-W41`. An
  item is unlocked once; a second grant from another source does nothing.
- **Unlocks are pushed, not polled.** `grant_item` sends `arcade:item_unlocked`
  to the user after the commit. Open tabs show a toast and reload the profile,
  so a scheduled job's grant appears while the player is in the game.
- **Seasons are data, shared by client and server.** `data/seasons.json` gives
  each season its days and the items it grants. The client picks the
  decorations from its local date; the server decides the grant from the same
  date through `player_today()`, so a client cannot claim another season.
  Diwali's days move, so it lists them per year; a year with no entry has no
  Diwali. Add next year's dates when they are known.
- **Decorations are baked into one map per season**, not added at runtime.
  `yarn build:arcade-map` writes `world.json` and `world.<season>.json`. The
  build checks every season: a decoration may not stand where people use a
  seat or any interactable, or on a spawn point, and may not cut anyone off
  from a cell they could reach before (`findDecorationProblems`). A bad
  placement fails the build, not a player's session, and `render_map.py` can
  show each season for review. The cost is about 80 KB of JSON per season,
  fetched only during that season.
- **The season is picked once, when the Arcade opens.** A session that runs
  past midnight into a season sees it on the next visit.
- **A season's light tints the whole world**, Library and Café included, with
  one multiply layer under the name tags. A light that stopped at the Common
  Room's walls showed a hard line across anyone walking through a door.
- **Season decor stays out of Homes.** Only the items a season grants are in
  the catalog (a Seasonal category). Bunting, cobwebs, wreaths and the like
  belong to the Common Room and are listed in `NOT_FOR_HOMES`.
- **Diwali uses candles and string lights only.** The pack has no diya,
  rangoli, marigold toran or Diwali lantern; its stone lanterns are Japanese.
  The Diwali item is the glowing candles. Nothing was drawn.
- **The Christmas tree collides on all 3 rows.** Its lights are a sprite that
  sorts by its bottom edge; tree tiles drawn over Avatars would hide the lights.
- **The Halloween and Christmas sheets load in every Room**, like every other
  tileset, about 200 KB more on first load. Homes need them once someone places
  a season item, and loading tilesets per map was not worth the change.
- **The Common Room has 2 bar stools, not 3.** Whole stools are 2 tiles wide,
  so only 2 fit at the counter. The cafe counter grew to 4 tiles for its 2
  window stools.
- **One shared plant per site, not per community.** The Arcade has one Common
  Room per site, and the plant stands in it, between the elevator and the Notice
  Board. Communities do not appear anywhere else in the Arcade.
- **Only the people who watered a plant get its cutting.** A cutting for every
  Home would reward people who never visited. `water_plant` grants the cutting
  to each contributor of that cycle, with the source `plant:<cycle>`.
- **Each plant is one `GP Arcade Plant` document, one per cycle**, with its
  waterings in a child table (user, day, time). The stage, the droop and the
  bloom are all worked out from the waterings, so there is no counter to get
  out of step. Only System Managers can read the doctype; players go through
  `get_plant` and `water_plant`.
- **The stage is 1 plus the number of different days it was watered**, up to 5.
  Three people watering on one day grow it one stage. At stage 5 it blooms and
  stays in bloom for the rest of that day. The first watering on a later day
  starts the next cycle with the next species in `data/plants.json`, which
  loops.
- **A plant droops when nobody has watered it for 3 days.** A new plant counts
  from the day the last one bloomed. A plant in bloom never droops. Watering a
  drooping plant revives it; it never loses a stage.
- **The plant loads the grocery sheet itself.** A Room loads only the sheets
  its map uses, and the Common Room map has no grocery tiles. Homes load every
  sheet already, so cuttings need nothing extra.
- **Answers are a new doctype, `GP Arcade Answer`, not notes.** Members can list
  every `GP Arcade Note`, and hiding the day's answers depends on the player's
  local date, which a list query cannot know. Answers are readable only through
  `get_question`, which sends the text of the answers only to a player who has
  answered that day. Before that it sends only how many people answered.
- **An answer can be changed on the same day**, not after. One answer per player
  per day, named `<day> <user>`. The question is picked from
  `data/questions.json` by the date, so everyone on the same day sees the same
  question.
- **No keepsake for an answer streak.** Left out as low priority.
- **Puzzles are built from the items they unlock.** `yarn build:arcade-puzzles`
  turns each item's pack tiles into a 10 x 10 silhouette and drops any that line
  logic alone cannot solve or that has two answers. It writes only the grids, so
  no pack pixels reach the repo. A person then checks the review sheet and keeps
  an item only if its grid still reads as the object. The test solves every
  puzzle again, so a hand edit cannot break one.
- **The day's puzzle is numbered from September 1, 2026** and loops through
  `data/puzzles.json`. Everyone on the same local day gets the same one.
- **The client gets the answer.** It shows a wrong fill at once, as in most
  nonogram games, and that needs the answer grid. A player who reads it from the
  network only spoils their own game. The server still checks the finished grid
  before it records anything.
- **A wrong fill is shown and counted, and the game goes on.** No lives and no
  game over. The result is the time and the number of mistakes.
- **The item and the results stay hidden until you solve it.** Before that,
  `get_puzzle` sends only how many people solved it. The item's name is left out
  too, so the answer is still a surprise. One result per player per day, named
  `<day> <user>`, in `GP Arcade Puzzle Result`, readable only by System Managers.
- **An unfinished puzzle is kept in the browser**, per player and day, so
  closing the dialog or reloading keeps the grid, the clock and the mistakes.
  The server has no record of a puzzle in progress.
- **The client scores the dart.** The dialog aims and scores, and the server
  only checks that the score is one a dart can make (59 is not) and that the
  player has a dart left today. A player who sends 60 three times a day only
  spoils the leaderboard, which is a friendly one.
- **The scoring rings are wider than a real board's.** The bull is 0.07 of the
  radius, the outer bull 0.15, the triple 0.55 to 0.63 and the double 0.91 to 1.
  At real widths, a triple is almost impossible to hit with the timing aim.
- **The aim is two sweeps and a wobble.** Each sweep takes 1.1 s to cross the
  board and starts from the same edge every time, so the rhythm can be learned.
  The wobble is a normal spread of 0.03 of the radius.
- **One `GP Arcade Dart Throw` per dart**, named `<day> <user> <n>`, with its
  ISO week stored on it. The week is the ISO week of the player's local date,
  so December 31 can be in week 1 of the next year.
- **A week is settled 2 days after its Sunday, in UTC.** `player_today` accepts
  a local date up to a day behind UTC, so a player far west can still throw on
  Sunday until then. Until the week is settled, "Last week" shows the leaders
  so far and says the result is not final.
- **Winners are recorded in `GP Arcade Darts Week`**, one document per week
  named by the week, with the winners in the child table
  `GP Arcade Darts Winner`. That document existing is what stops a week from
  being settled twice. Every tied player wins. A week whose best total is 0 has
  no winners. A player who already has the trophy gets no new one, but the win
  still counts toward "N wins".
- **The leaderboard breaks ties by fewer darts thrown**, then by user. This
  only orders the list. It does not decide who wins.
- **The game draws the dartboard.** The pack has no dartboard, so
  `objects/Dartboard.ts` draws a small pixel-art one on a canvas, and a strip of
  tape marks the line. The cue rack left the Common Room wall to make room, and
  the Christmas tree moved to (14, 5).
- **A `use` can carry a number.** `arcade:use` takes an optional whole number
  from 0 to 999, and the others in the Room get it in `arcade:used`. Darts sends
  the score, so everyone sees the dart land where it scored. An interaction's
  `observe` now gets the thrower's name and the number with the Avatar.
- **The darts dialog sits at the top of the screen**, so the board does not move
  when the leaderboard beside or below it grows.
- **The dates are hidden by permlevel 1.** `birthday`, `work_anniversary` and
  `work_start_year` sit at permlevel 1, which only System Manager can read, so
  `/api/resource`, `get_list` and `get_value` leave them out (an Int reads as 0)
  and filtering on them is refused. Players read and write their own dates only
  through `get_dates` and `set_dates`, and see other people's only as today's
  celebrations from `get_celebrations`.
- **A work anniversary may carry the year you joined.** It is optional and only
  counts the years ("3 years on the team for ..."). Without it the line says
  "Happy work anniversary, ...". A birthday never has a year.
- **February 29 is celebrated on February 28** in years without one.
- **The party corner is a plain table baked into the map, at (8, 12)** beside
  the long table. The game draws the cake, balloons and lines on it only on a
  day with a celebration. (8, 13) was refused by the map check because the
  Halloween decorations stand in front of it.
- **One cake for everyone celebrating that day.** The cake shows every candle
  added that day; the card lists each celebration with its own count. Pressing
  E adds your candle to every celebration you have not candled yet.
- **Candles are per year.** `GP Arcade Candle` is named
  `<occasion> <year> <celebrant> <user>`, so the name refuses a second candle.
  The celebrant may add a candle to their own cake.
- **The cake is the pack's red cake with its own candle painted out**, so every
  candle on it is one somebody added. The game draws the candles in the pack's
  style, round a ring on the cake's top, up to 12.
- **The unlock is claimed when the Arcade opens**, after the profile has loaded,
  and again after the player saves their dates. The server checks the date and
  grants each item once a year (`birthday:<year>`, `anniversary:<year>`).
- **Only the Common Room cat is the team cat.** A cat on a pet bed in a Home
  keeps no name and counts no pets.
- **One `GP Arcade Cat Day` per player per local day**, named `<day> <user>`,
  holds both what a player did to the cat that day: `petted_at` for the first
  pet and `cat_name` with `named_at` for a rename. The name is the lock, so a
  second rename that day is refused, and a second pet changes nothing. The cat's
  name is the one on the row with the latest `named_at`. Starting it unnamed is
  the default: a name should come from the team.
- **The favourite person has petted the cat on the most days.** On a tie, the
  one who reached that count first stays the favourite (the earlier last
  counted pet), then by user. The favourite does not flip back and forth when
  someone else draws level.
- **A cat napping on a seat gives way.** It cannot be petted there, and "Sit"
  shows. Sitting down sends it back to its bed along the way it came. It only
  picks a seat nobody sits on, looking at presence when it leaves its bed.
- **The cat's cycle is 60 s, and trips are at most 12 tiles.** In a cycle it
  wanders (0.3), naps on a seat (0.25), sits by its favourite person if they
  are in the Room and in reach (0.25), or stays on its bed. A game that joins
  mid-trip decides from what it sees then; the cycle after, every game agrees.
- **A cat `use` carries 1 when a pet counted and 2 for a rename**, so the other
  games reload the card only when something changed.

## What unlocks what

| Feature                     | Unlocks                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| Shared plant                | A cutting for everyone who watered it, when it blooms; a new plant starts  |
| Daily puzzle                | The pixel item the solved puzzle shows                                     |
| Darts                       | A trophy for the weekly winner                                             |
| Birthdays and anniversaries | A cake or badge for your Home                                              |
| Seasonal decorations        | An item you can only get by visiting during the season                     |
| Question of the day         | Possibly a keepsake for a streak of answers (low priority)                 |

Unlocked items appear in the Home decorating catalog. Locked items appear
grayed out, with a hint on how to get them.

## Order

1. **Collection foundation.** A record of what each user unlocked and from
   which source, plus locked and unlocked states in the catalog. Also fix the
   bar stools, whose sprites are cut off.
   Done: `grant_item` and the `unlocks` table on `GP Arcade Profile`, the
   shared list in `data/lockable-items.json`, locked items in the Decorate
   catalog, the "New item" toast, the `today` helpers, and whole sprites for
   the stools and 12 other prefabs. See "Collection" in `playable-slice.md`.
2. **Halloween decorations.** Must ship by October 31. This is the first feature
   to unlock items, and it needs no new game mechanic. Diwali and Christmas
   reuse the same setup.
   Done: seasons in `data/seasons.json`, the Common Room decorated for
   Halloween, Diwali and Christmas with a soft tint, 5 season items granted on
   entering, and a dev-only `?season=` preview. See "Seasons" in
   `playable-slice.md`.
3. **Shared plant and question of the day.**
   Done: the shared plant in the Common Room with 3 species and their
   cuttings, and the question of the day on the Notice Board with answers
   hidden until you answer. See "Shared plant" and "Question of the day" in
   `playable-slice.md`.
4. **Daily puzzle.**
   Done: a puzzle cabinet in the Common Room with a 10 x 10 pixel nonogram each
   day, 41 puzzles whose answers are Home items, results hidden until you solve
   it, and the solved item unlocked into your Collection. See "Daily puzzle" in
   `playable-slice.md`.
5. **Darts and the weekly leaderboard.**
   Done: a dartboard on the Common Room wall with 3 darts a day, aimed by
   timing, a weekly leaderboard with each player's wins, other players' darts
   shown live, and a daily job that gives last week's winners the Darts trophy.
   See "Darts" in `playable-slice.md`.
6. **Birthdays and anniversaries.**
   Done: opt-in dates in a "Your dates" dialog, a party corner in the Common
   Room with a cake, balloons and a line for each celebrant, one candle per
   person per celebration with the celebrant seeing who, candles shown live,
   and the Birthday cake or Anniversary plaque unlocked on the day. See
   "Birthdays and anniversaries" in `playable-slice.md`.
7. **Team cat.**
   Done: a name anyone can give the Common Room cat once a day, naps on free
   seats, a favourite person it sits beside with a heart, and a card with all
   three. See "Team cat" in `playable-slice.md`.

## Rejected for now

Coins and a shop, personal pets, games that only work when several people are
online, postcards, board games, fishing and mini-golf.
