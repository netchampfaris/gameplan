"""Composite a generated Tiled JSON map into a PNG for quick visual review.

Usage:
    python arcade/scripts/render_map.py <map.json> [out.png]

Renders visible tile layers in order (plus the hidden Collision layer as a red
overlay when --collision is passed). Tileset image paths are resolved relative
to the map file, matching how Phaser loads them.
"""

import json
import sys
from pathlib import Path

from PIL import Image

TILE = 48


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    show_collision = '--collision' in sys.argv
    map_path = Path(args[0])
    out_path = Path(args[1]) if len(args) > 1 else map_path.with_suffix('.png')

    data = json.loads(map_path.read_text())
    width, height = data['width'], data['height']

    sheets = []
    for ts in sorted(data['tilesets'], key=lambda t: t['firstgid']):
        image = Image.open((map_path.parent / ts['image']).resolve()).convert('RGBA')
        sheets.append((ts['firstgid'], ts['firstgid'] + ts['tilecount'], ts['columns'], image))

    def tile_image(gid):
        for first, end, columns, image in sheets:
            if first <= gid < end:
                local = gid - first
                row, col = divmod(local, columns)
                return image.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE))
        return None

    canvas = Image.new('RGBA', (width * TILE, height * TILE), (24, 24, 28, 255))
    for layer in data['layers']:
        if layer['type'] != 'tilelayer':
            continue
        is_collision = any(
            p['name'] == 'collision' and p['value'] for p in layer.get('properties', [])
        )
        if is_collision and not show_collision:
            continue
        if not layer.get('visible', True) and not is_collision:
            continue
        for index, gid in enumerate(layer['data']):
            if gid == 0:
                continue
            x, y = (index % width) * TILE, (index // width) * TILE
            if is_collision:
                overlay = Image.new('RGBA', (TILE, TILE), (255, 0, 0, 90))
                canvas.alpha_composite(overlay, (x, y))
                continue
            tile = tile_image(gid)
            if tile is not None:
                canvas.alpha_composite(tile, (x, y))

    canvas.save(out_path)
    print(f'rendered {out_path} ({canvas.width}x{canvas.height})')


if __name__ == '__main__':
    main()
