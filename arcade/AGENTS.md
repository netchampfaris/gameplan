# Arcade Agent Notes

## Local Site

- Site: `gameplan-arcade.localhost` in `~/Projects/benches/frappe-bench`
- Arcade: `http://gameplan-arcade.localhost:8080/g/arcade`
- Asset editor (dev server only): `http://gameplan-arcade.localhost:8080/g/arcade/assets`
- Use port 8080. Port 8000 serves the production build, which loads sheets from
  `VITE_ARCADE_ASSET_URL`. Without it, the 8 sheets 404 and the game stops with
  `Sprite texture not found`. That is expected until the sheets are published.

## Assets

- **Never commit files from the LimeZu pack.** It is licensed, not ours to redistribute.
  `arcade/pack/` is a gitignored symlink to it. Our own data lives in `arcade/data/`.
- To use a new sheet in the game, add it to `config/packFiles.ts`. The dev server
  serves it from the pack, and `yarn arcade:publish-assets` uploads it to the CDN.
- Atlas file: `arcade/data/sprite_atlases.json`. The asset editor writes it through
  the Vite plugin in `vite/arcadePlugin.ts`, not through a Frappe endpoint.
- Character 01 sheet: `arcade/pack/2_Characters/Character_Generator/0_Premade_Characters/48x48/Premade_Character_48x48_01.png`
