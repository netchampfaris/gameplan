# Arcade

Arcade's art is the [LimeZu Modern Interiors](https://limezu.itch.io/moderninteriors) pack.
The pack is licensed, so it is not in this repository.

| What | Where |
| --- | --- |
| LimeZu pack | `arcade/pack/` (gitignored). In production, a Cloudflare Pages CDN. |
| Our data (maps) | `arcade/data/`, bundled with the app |
| Sheets the game loads | `config/packFiles.ts` |

## Set up

Put the pack at `arcade/pack/`. A symlink works:

```sh
ln -s ~/Projects/arcade-assets/limezu-modern-interiors arcade/pack
```

The Vite dev server then serves it at `/arcade-assets/`.

Open Arcade on the Vite dev server (port 8080). A production build, which is
what port 8000 serves, loads sheets from the CDN, so it only works after you
publish them and set `VITE_ARCADE_ASSET_URL`.

## Publish sheets to the CDN

```sh
npx wrangler login                 # once
yarn arcade:publish-assets         # uploads only the files in config/packFiles.ts
```

On the first run, wrangler creates the Pages project (`gameplan-sprites` by default;
set `ARCADE_PAGES_PROJECT` to change it). Put the URL it prints in
`frontend/.env.production` as `VITE_ARCADE_ASSET_URL`. Run the script again
whenever `packFiles.ts` changes.

## Multiplayer

Presence (who is in a Room, where they stand, what they say) goes through
Frappe's socket.io server. Frappe loads `realtime/handlers.js` from the app root,
which loads `realtime/arcade.js`. Nothing about presence is stored.

After changing `realtime/handlers.js`, restart the socketio process (in
`bench start`, restart its `socketio` entry). With `developer_mode` on,
`realtime/arcade.js` is re-read for every new connection, so reloading the tab
is enough.

To have company while you work, run a bot:

```sh
yarn arcade:bot                                    # as arcade.two@example.com
yarn arcade:bot --user arcade.three@example.com    # a second one
yarn arcade:bot --site other.localhost --user me@example.com --password secret
```

The bot logs in over HTTP, joins the Common Room, wanders, chats and emotes,
and logs what others do. Stop it with Ctrl+C.

## Notes

Notice Board and Guestbook notes are `GP Arcade Note` documents. With Home
layouts (below), they are the only Arcade content that is stored. Everything else a player does with things in the
Room (coffee, the jukebox) goes through the socket and is gone
when they leave.

## Homes

Everyone has a Home, `home:<user>`, reached from the elevator in the Common Room
or at `/g/arcade/home/<user>`. Its layout (wallpaper, floor, furniture) is JSON
on the owner's `GP Arcade Profile`, and the owner changes it in Decorate mode.
Before they save one, they get a starter Home. Details: `docs/playable-slice.md`.
