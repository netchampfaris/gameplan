# Arcade

Arcade's art is the [LimeZu Modern Interiors](https://limezu.itch.io/moderninteriors) pack.
The pack is licensed, so it is not in this repository.

| What | Where |
| --- | --- |
| LimeZu pack | `arcade/pack/` (gitignored). In production, a Cloudflare Pages CDN. |
| Our data (maps, sprite atlases) | `arcade/data/`, bundled with the app |
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
