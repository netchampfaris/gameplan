# Arcade

Arcade is Gameplan's casual multiplayer hangout.

## Language

**Arcade**:
The casual multiplayer feature inside Gameplan where teammates appear as avatars in shared spaces.
_Avoid_: Game Mode, RPG Game Mode, Social World

**Room**:
A shared place inside the **Arcade**. Arcade starts with one Room, the **Common Room**, but may support multiple Rooms later.
_Avoid_: World, server, channel

**Common Room**:
The first shared **Room** in the **Arcade** and the default place users enter.
_Avoid_: Lobby, hub, world

**Avatar**:
A user's visible character inside the **Arcade**.
_Avoid_: Player character, sprite, RPG character

**Home**:
A person's own **Room**, which they decorate and others can visit. Every user has exactly one.
_Avoid_: Igloo, apartment, personal space, pod

**Guestbook**:
Notes that visitors leave in a **Home**. The owner reads them later.
_Avoid_: Comments, wall

**Notice Board**:
The board in the **Common Room** where anyone pins a short note for everyone.
_Avoid_: Bulletin, feed

**Decorate mode**:
The state in which a **Home**'s owner places, moves and removes furniture and picks the floor and wallpaper.
_Avoid_: Edit mode, build mode

**Collection**:
The items a user has unlocked for their **Home**. Features add to it; nothing is bought.
_Avoid_: Inventory, rewards, achievements

**Locked item**:
A catalog item a user must unlock before placing it. The **Decorate mode** catalog shows it grayed out with a hint on how to get it. Items that are not lockable are free to everyone.
_Avoid_: Premium item, rare item

**Unlock**:
One item entering a user's **Collection**, with its **Source** and time. Only the server grants one, and each item is unlocked once.
_Avoid_: Reward, drop, purchase

**Source**:
What caused an **Unlock**, written `kind:detail`, such as `season:halloween-2026` or `puzzle:2026-10-03`.
_Avoid_: Origin, reason

**Season**:
A time of year (Halloween, Diwali, Christmas) when the **Common Room** is decorated and entering the **Arcade** unlocks a few **Locked items**, with the **Source** `season:<id>-<year>`.
_Avoid_: Event, holiday mode, theme

**Shared plant**:
The one plant in the **Common Room** that everyone grows together. Each person can water it once a day, and it grows a stage on each day someone does. It droops after 3 days without water but never dies. At full growth it blooms, and the next day a new one of another species starts.
_Avoid_: Team plant, garden, pet plant

**Cutting**:
The **Locked item** a **Shared plant** gives everyone who watered it when it blooms, with the **Source** `plant:<cycle>`. A potted version of that species for their **Home**.
_Avoid_: Seed, clipping, reward

**Question of the day**:
One question at the top of the **Notice Board**, the same for everyone on the same local day. A user sees other people's answers only after posting their own, and can change their answer until the day ends.
_Avoid_: Prompt, poll, icebreaker

**Daily puzzle**:
A 10 x 10 pixel nonogram at the puzzle cabinet in the **Common Room**, the same for everyone on the same local day. Its answer is the silhouette of a **Locked item**, and solving it unlocks that item with the **Source** `puzzle:<day>`. A user sees who solved it, and their times, only after solving it.
_Avoid_: Wordle, daily game, challenge

**Darts**:
The dartboard on the **Common Room** wall. Each user throws 3 darts a day, aimed by timing, and everyone in the **Room** sees each dart land. A user's darts in a week add up to their score on that week's leaderboard.
_Avoid_: Dart game, minigame

**Darts line**:
The strip of tape on the **Common Room** floor below the dartboard. Standing on it and pressing E opens **Darts**.
_Avoid_: Oche, throwing spot

**Darts week**:
An ISO week, written like `2026-W40`, of the user's local date. Once it has ended everywhere, its **Weekly winners** are recorded.
_Avoid_: Round, season (a **Season** is something else)

**Weekly winner**:
Everyone with the best total in a **Darts week**, so a tie has several. Each gets the **Darts trophy**, and each win counts toward the "N wins" beside their name.
_Avoid_: Champion, leader (a leader is ahead in a week not yet over)

**Darts trophy**:
The **Locked item** a **Weekly winner** gets, with the **Source** `darts:<week>`. Winning again adds a win, not a second trophy.
_Avoid_: Cup, prize

**Celebration**:
A user's birthday or work anniversary, on the day it falls in the user's local date. Both are opt-in, set as day and month in "Your dates", and only the user can read them back. A February 29 birthday is celebrated on February 28 in other years.
_Avoid_: Event, party (the **Party corner** is where it shows)

**Celebrant**:
The user a **Celebration** is for. On their day they see who added a **Candle**, and they unlock the Birthday cake (**Source** `birthday:<year>`) or the Anniversary plaque (`anniversary:<year>`).
_Avoid_: Birthday person, honoree

**Candle**:
One user's wish on a **Celebration**, added at the **Party corner**. A user adds at most one per **Celebration** per year. Everyone sees how many candles there are; only the **Celebrant** sees who added them.
_Avoid_: Like, reaction, wish

**Party corner**:
The table beside the long table in the **Common Room**. On a day with a **Celebration** it shows a cake with the **Candles** on it, two balloons, and a line for each **Celebrant**. On other days it is a plain table.
_Avoid_: Cake table, birthday table

**Team cat**:
The cat on the pet bed in the **Common Room**. Anyone can pet it. It naps on its bed, wanders, naps on an empty seat or sits beside its **Favourite person**, on a clock every game shares. A cat in a **Home** is just a cat.
_Avoid_: Office cat, mascot, pet (a pet bed is where it sleeps)

**Cat name**:
The name the team gives the **Team cat**. Anyone can rename it once a day, everyone sees the new name, and until someone names it, it is "the cat".
_Avoid_: Nickname, title

**Favourite person**:
Whoever has petted the **Team cat** on the most days. A user's pets count once a day. On a tie, whoever reached that count first stays the favourite.
_Avoid_: Owner, best friend, top petter
