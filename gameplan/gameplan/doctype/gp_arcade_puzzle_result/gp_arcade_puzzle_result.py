# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A player's solved daily puzzle, played at the puzzle cabinet in the Common Room.

Everyone with the same local date gets the same 10 x 10 nonogram, picked from
`arcade/data/puzzles.json` by the date. Its answer is the silhouette of a Home item, and
solving it unlocks that item. The client checks each cell as the player fills it and
times them; the server checks only the finished grid, then records the result and grants
the item. A player sees today's results only after solving: `get_puzzle` leaves them out
until then, and the doctype is for System Managers, so the list API cannot reveal them.

One document per player per day, named `<day> <user>`, so the database refuses a second.
"""

from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	arcade_data,
	check_arcade_access,
	grant_item,
)

# Puzzle #1 is the puzzle of this day; the number goes up by one a day.
FIRST_PUZZLE_DAY = date(2026, 9, 1)
# A day, and one wrong fill per cell: anything more is not a real game.
MAX_SECONDS = 24 * 60 * 60
MAX_MISTAKES = 100


class GPArcadePuzzleResult(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		day: DF.Date
		item: DF.Data
		mistakes: DF.Int
		seconds: DF.Int
		user: DF.Link
	# end: auto-generated types

	def autoname(self):
		self.name = result_name(frappe.utils.getdate(self.day), self.user)


def result_name(day: date, user: str) -> str:
	return f"{day.isoformat()} {user}"


def puzzle_number(day: date) -> int:
	return (day - FIRST_PUZZLE_DAY).days + 1


def puzzle_on(day: date) -> dict:
	"""The puzzle of the day, `{item, rows}`: the same for everyone whose local date is `day`."""
	puzzles = arcade_data("puzzles.json")
	return puzzles[(puzzle_number(day) - 1) % len(puzzles)]


def puzzle_status(day: date) -> dict:
	"""The puzzle on `day` for the session user. The item it draws and everyone's results
	are there only once they have solved it too."""
	puzzle = puzzle_on(day)
	mine = frappe.db.get_value(
		"GP Arcade Puzzle Result",
		result_name(day, frappe.session.user),
		["seconds", "mistakes"],
		as_dict=True,
	)
	return {
		"day": day.isoformat(),
		"number": puzzle_number(day),
		# The client needs the answer to show a wrong fill at once. It draws the picture
		# only after the player solves it.
		"rows": puzzle["rows"],
		"item": puzzle["item"] if mine else None,
		"result": {"seconds": mine.seconds, "mistakes": mine.mistakes} if mine else None,
		"count": frappe.db.count("GP Arcade Puzzle Result", {"day": day}),
		"results": results_on(day) if mine else [],
	}


def results_on(day: date) -> list[dict]:
	"""Everyone who solved the puzzle on `day`, fastest first."""
	results = frappe.get_all(
		"GP Arcade Puzzle Result",
		filters={"day": day},
		fields=["user", "seconds", "mistakes"],
		order_by="seconds asc, mistakes asc, creation asc",
	)
	users = [row.user for row in results] or [""]
	names = dict(
		frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name"], as_list=True)
	)
	appearances = dict(
		frappe.get_all(
			"GP Arcade Profile",
			filters={"user": ["in", users]},
			fields=["user", "appearance"],
			as_list=True,
		)
	)
	return [
		{
			"user": row.user,
			"full_name": names.get(row.user) or row.user,
			"appearance": frappe.parse_json(appearances[row.user]) if appearances.get(row.user) else None,
			"seconds": row.seconds,
			"mistakes": row.mistakes,
		}
		for row in results
	]


@frappe.whitelist()
def get_puzzle(today: str):
	"""The puzzle on the player's local `today`: its answer grid, how many have solved it,
	and, once the player has solved it, its item, their result and everyone's results."""
	check_arcade_access()
	return puzzle_status(player_today(today))


@frappe.whitelist(methods=["POST"])
def submit_puzzle(today: str, grid: list[str], seconds: int, mistakes: int):
	"""Record the player's solved puzzle for their local `today` and unlock its item.

	`grid` is the filled grid as rows of `#` (filled) and `.` (empty or marked empty).
	Refused if it is not the answer, or if the player already solved today's puzzle.
	"""
	check_arcade_access()
	day = player_today(today)
	puzzle = puzzle_on(day)
	if grid != puzzle["rows"]:
		frappe.throw(_("That is not the answer"), frappe.ValidationError)
	# Frappe checks the types from the annotations; these are the limits.
	if not 0 <= seconds <= MAX_SECONDS:
		frappe.throw(_("The time is not valid"), frappe.ValidationError)
	if not 0 <= mistakes <= MAX_MISTAKES:
		frappe.throw(_("The mistake count is not valid"), frappe.ValidationError)

	user = frappe.session.user
	if frappe.db.exists("GP Arcade Puzzle Result", result_name(day, user)):
		frappe.throw(_("You already solved today's puzzle"), frappe.ValidationError)
	frappe.new_doc(
		"GP Arcade Puzzle Result",
		user=user,
		day=day,
		item=puzzle["item"],
		seconds=seconds,
		mistakes=mistakes,
	).insert(ignore_permissions=True)
	grant_item(user, puzzle["item"], f"puzzle:{day.isoformat()}")
	return puzzle_status(day)
