"""Reverse-engineer LimeZu home-design examples into tile-ID grids.

The 6_Home_Designs pack ships each example as layer PNGs (Layer 1 = floors +
walls, Layer 2 = furniture) composed from the same 48x48 spritesheets the
arcade maps use. Slicing a layer into 48x48 cells and exact-matching each cell
against the spritesheets recovers the exact tile IDs and their arrangement —
turning the artist's examples into data we can study and copy in
`arcade/maps/*.layout.ts`.

Usage:
    python arcade/scripts/analyze_home_design.py <layer.png> [<layer2.png> ...]

Writes `<name>.grid.json` and `<name>.grid.txt` next to this repo's
`arcade/maps/design-reference/` directory. Tile references use the same
`sheet:localId` convention as `gid(sheet, id)` in `arcade/maps/prefabs.ts`.
"""

import json
import sys
from pathlib import Path

from PIL import Image

TILE = 48
REPO = Path(__file__).resolve().parents[2]
INTERIORS = REPO / "arcade/pack/1_Interiors/48x48"
OUT_DIR = REPO / "arcade/maps/design-reference"

# Sheets to match against, in priority order. Names match the tileset registry
# in arcade/maps/tiled.ts where registered; extra theme sheets use their file
# stem so they can be registered later without re-running the analysis.
SHEETS = [
	("room_builder", INTERIORS / "Room_Builder_48x48.png"),
	("living_room", INTERIORS / "Theme_Sorter_48x48/2_LivingRoom_48x48.png"),
	("generic", INTERIORS / "Theme_Sorter_48x48/1_Generic_48x48.png"),
	("kitchen", INTERIORS / "Theme_Sorter_48x48/12_Kitchen_48x48.png"),
	("conference_hall", INTERIORS / "Theme_Sorter_48x48/13_Conference_Hall_48x48.png"),
	("classroom_library", INTERIORS / "Theme_Sorter_48x48/5_Classroom_and_library_48x48.png"),
	("basement", INTERIORS / "Theme_Sorter_48x48/14_Basement_48x48.png"),
	("bathroom", INTERIORS / "Theme_Sorter_48x48/3_Bathroom_48x48.png"),
	("bedroom", INTERIORS / "Theme_Sorter_48x48/4_Bedroom_48x48.png"),
	("music", INTERIORS / "Theme_Sorter_48x48/6_Music_and_sport_48x48.png"),
	("art", INTERIORS / "Theme_Sorter_48x48/7_Art_48x48.png"),
	("shop", INTERIORS / "Theme_Sorter_48x48/8_Shop_48x48.png"),
	("gym", INTERIORS / "Theme_Sorter_48x48/9_Gym_48x48.png"),
	("fishing", INTERIORS / "Theme_Sorter_48x48/10_Fishing_48x48.png"),
	("jail", INTERIORS / "Theme_Sorter_48x48/11_Jail_48x48.png"),
	("hospital", INTERIORS / "Theme_Sorter_48x48/15_Hospital_48x48.png"),
	("condominium", INTERIORS / "Theme_Sorter_48x48/16_Condominium_48x48.png"),
]


def build_index():
	index = {}
	for name, path in SHEETS:
		if not path.exists():
			continue
		sheet = Image.open(path).convert("RGBA")
		cols = sheet.width // TILE
		for row in range(sheet.height // TILE):
			for col in range(cols):
				tile = sheet.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE))
				key = tile.tobytes()
				# first sheet wins so room_builder ids stay canonical
				index.setdefault(key, f"{name}:{row * cols + col}")
	return index


def analyze(layer_path: Path, index) -> dict:
	image = Image.open(layer_path).convert("RGBA")
	grid = []
	unmatched = 0
	for ty in range(image.height // TILE):
		row = []
		for tx in range(image.width // TILE):
			tile = image.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE))
			if not tile.getbbox():
				row.append(None)
				continue
			ref = index.get(tile.tobytes())
			if ref is None:
				unmatched += 1
				ref = "?"
			row.append(ref)
		grid.append(row)
	return {"source": layer_path.name, "unmatched": unmatched, "grid": grid}


def text_grid(result: dict) -> str:
	lines = [f"# {result['source']} (unmatched: {result['unmatched']})"]
	width = max(
		(len(cell) for row in result["grid"] for cell in row if cell),
		default=1,
	)
	for y, row in enumerate(result["grid"]):
		cells = [(cell or ".").rjust(width) for cell in row]
		lines.append(f"{y:3d} | " + " ".join(cells))
	return "\n".join(lines) + "\n"


def main():
	paths = [Path(p) for p in sys.argv[1:]]
	if not paths:
		print(__doc__)
		sys.exit(1)
	OUT_DIR.mkdir(exist_ok=True)
	index = build_index()
	for path in paths:
		result = analyze(path, index)
		stem = path.stem
		(OUT_DIR / f"{stem}.grid.json").write_text(json.dumps(result, indent=1))
		(OUT_DIR / f"{stem}.grid.txt").write_text(text_grid(result))
		print(f'{stem}: unmatched={result["unmatched"]} -> {OUT_DIR / f"{stem}.grid.txt"}')


if __name__ == "__main__":
	main()
