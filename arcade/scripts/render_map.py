"""Composite a generated Tiled JSON map into a PNG for quick visual review.

Usage:
    python arcade/scripts/render_map.py <map.json> [out.png] [options]

Options:
    --collision          tint colliding cells red
    --objects            outline interactables (blue) and mark spawn points (green)
    --crop=x0,y0,x1,y1   render only these tiles (inclusive)
    --scale=N            enlarge the result N times

Draws layers in the order the scene stacks them: Floor, Decor, Objects Back,
Objects Front, the first frame of each animated prop (sorted by bottom edge,
as the scene sorts them), then Above. Sheets are read from the local LimeZu
pack in arcade/pack/.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

TILE = 48
PACK = Path(__file__).resolve().parents[1] / "pack"
BELOW_PROPS = ["Floor", "Decor", "Objects Back", "Objects", "Objects Front"]
ABOVE_PROPS = ["Above"]


def properties(obj):
	return {p["name"]: p["value"] for p in obj.get("properties", [])}


def main():
	args = [a for a in sys.argv[1:] if not a.startswith("--")]
	options = dict(
		a[2:].split("=", 1) if "=" in a else (a[2:], "") for a in sys.argv[1:] if a.startswith("--")
	)
	map_path = Path(args[0])
	out_path = Path(args[1]) if len(args) > 1 else map_path.with_suffix(".png")

	data = json.loads(map_path.read_text())
	width, height = data["width"], data["height"]
	layers = {layer["name"]: layer for layer in data["layers"]}

	sheets = []
	for ts in sorted(data["tilesets"], key=lambda t: t["firstgid"]):
		image = Image.open(PACK / ts["image"]).convert("RGBA")
		sheets.append((ts["firstgid"], ts["firstgid"] + ts["tilecount"], ts["columns"], image))

	def tile_image(gid):
		for first, end, columns, image in sheets:
			if first <= gid < end:
				row, col = divmod(gid - first, columns)
				return image.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE))
		return None

	canvas = Image.new("RGBA", (width * TILE, height * TILE), (24, 24, 28, 255))

	def draw_tiles(name):
		layer = layers.get(name)
		if not layer or layer["type"] != "tilelayer":
			return
		for index, gid in enumerate(layer["data"]):
			tile = tile_image(gid) if gid else None
			if tile is not None:
				canvas.alpha_composite(tile, ((index % width) * TILE, (index // width) * TILE))

	for name in BELOW_PROPS:
		draw_tiles(name)

	props = layers.get("Animated Props", {}).get("objects", [])
	for obj in sorted(props, key=lambda o: o["y"] + o["height"]):
		p = properties(obj)
		sheet = Image.open(PACK / p["image"]).convert("RGBA")
		frame = sheet.crop((0, 0, p["frameWidth"], p["frameHeight"]))
		canvas.alpha_composite(frame, (round(obj["x"]), round(obj["y"])))

	for name in ABOVE_PROPS:
		draw_tiles(name)

	draw = ImageDraw.Draw(canvas)
	if "collision" in options and "Collision" in layers:
		for index, gid in enumerate(layers["Collision"]["data"]):
			if gid:
				x, y = (index % width) * TILE, (index // width) * TILE
				canvas.alpha_composite(Image.new("RGBA", (TILE, TILE), (255, 0, 0, 90)), (x, y))
	if "objects" in options:
		for obj in layers.get("Interactables", {}).get("objects", []):
			box = [obj["x"] + 2, obj["y"] + 2, obj["x"] + obj["width"] - 3, obj["y"] + obj["height"] - 3]
			draw.rectangle(box, outline=(40, 120, 255, 255), width=3)
		for obj in layers.get("Spawn Points", {}).get("objects", []):
			x, y = obj["x"], obj["y"]
			draw.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(40, 220, 90, 255))

	if "crop" in options:
		x0, y0, x1, y1 = (int(v) for v in options["crop"].split(","))
		canvas = canvas.crop((x0 * TILE, y0 * TILE, (x1 + 1) * TILE, (y1 + 1) * TILE))
	if "scale" in options:
		scale = float(options["scale"])
		canvas = canvas.resize((int(canvas.width * scale), int(canvas.height * scale)), Image.NEAREST)

	canvas.save(out_path)
	print(f"rendered {out_path} ({canvas.width}x{canvas.height})")


if __name__ == "__main__":
	main()
