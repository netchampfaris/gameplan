# Common Room Object Palette

This palette maps useful tiles from the current `common_room.json` tilesets.

## Tilesets

| Tileset | First GID | Columns | Tile Size | Image |
| --- | ---: | ---: | ---: | --- |
| `room_builder` | `1` | `30` | `48x48` | `Room_Builder_48x48.png` |
| `living_room` | `1801` | `16` | `48x48` | `2_LivingRoom_48x48.png` |

Formula: `gid = first_gid + local_tile_id`.

## Room Builder

| Use | Local Tile IDs | GIDs | Notes |
| --- | --- | --- | --- |
| Base floor | `495` | `496` | Neutral floor tile used across the room. |

## Living Room

| Use | Local Tile IDs | GIDs | Size | Notes |
| --- | --- | --- | --- | --- |
| Tall plant/tree | `10,11 / 26,27 / 42,43` | `1811,1812 / 1827,1828 / 1843,1844` | `2x3` | Good edge filler; block collision. |
| Slim plant | `12 / 28 / 44` | `1813 / 1829 / 1845` | `1x3` | Good for corners and narrow gaps. |
| Bookshelf row A | `394-399 / 410-415` | `2195-2200 / 2211-2216` | `6x2` | Top-wall identity strip; split into 2x2/3x2 chunks. |
| Sectional couch A | `448-451 / 464-467 / 480-483` | `2249-2252 / 2265-2268 / 2281-2284` | `4x3` | Main lounge anchor. |
| Small desk/table cluster | `217,218 / 233,234 / 249,250` | `2018,2019 / 2034,2035 / 2050,2051` | `2x3` | Works as a side table or quiet nook object. |
| Pillow/decor overlay | `508,509 / 524,525` | `2309,2310 / 2325,2326` | `2x2` | Optional front/decor layer on lounge objects. |

## Current Layout Intent

| Zone | Position | Objects |
| --- | --- | --- |
| Spawn | Center, around `x=9-11`, `y=8-10` | Mostly empty floor with spawn point objects. |
| Lounge | Left-middle | Sectional couch, side table, small decor. |
| Identity wall | Top wall | Bookshelves and plants. |
| Activity corner | Right-middle | Plant and table cluster reserved for future interaction. |
