# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""The daily puzzle at the puzzle cabinet in the Common Room.

Everyone with the same local date gets the same nonogram. Solving it records one result
per player per day and unlocks the Home item it draws. A player sees the day's results
only after solving it.
"""

from contextlib import contextmanager
from datetime import date, timedelta
from functools import cache
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import arcade_data, lockable_items
from gameplan.gameplan.doctype.gp_arcade_puzzle_result.gp_arcade_puzzle_result import (
	get_puzzle,
	puzzle_on,
	submit_puzzle,
)
from gameplan.tests.base import GameplanTestCase

DAY_ONE = date(2026, 10, 5)


def unlocks(user) -> list[tuple[str, str]]:
	if not frappe.db.exists("GP Arcade Profile", user.name):
		return []
	return [(row.item, row.source) for row in frappe.get_doc("GP Arcade Profile", user.name).unlocks]


class TestDailyPuzzle(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Rolled back with the rest of the test.
		frappe.db.delete("GP Arcade Puzzle Result")

	@contextmanager
	def on_day(self, offset: int = 0):
		day = DAY_ONE + timedelta(days=offset)
		with patch("gameplan.arcade.utc_today", return_value=day):
			yield day.isoformat()

	def open(self, user, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return get_puzzle(today)

	def solve(self, user, grid=None, seconds=95, mistakes=2, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			answer = puzzle_on(date.fromisoformat(today))["rows"]
			return submit_puzzle(today, answer if grid is None else grid, seconds, mistakes)

	def test_solving_unlocks_the_item_and_shows_results_only_to_solvers(self):
		puzzle = puzzle_on(DAY_ONE)
		fresh = self.open(self.member)
		self.assertEqual(fresh["rows"], puzzle["rows"])
		self.assertEqual(
			(fresh["item"], fresh["result"], fresh["count"], fresh["results"]), (None, None, 0, [])
		)

		with patch("frappe.realtime.publish_realtime") as publish:
			solved = self.solve(self.member, seconds=95, mistakes=2)
		self.assertEqual(solved["item"], puzzle["item"])
		self.assertEqual(solved["result"], {"seconds": 95, "mistakes": 2})
		self.assertEqual(unlocks(self.member), [(puzzle["item"], f"puzzle:{DAY_ONE.isoformat()}")])
		publish.assert_called_once()

		# Someone who has not solved it sees how many did, and nothing else.
		theirs = self.open(self.second_member)
		self.assertEqual((theirs["item"], theirs["count"], theirs["results"]), (None, 1, []))
		self.assertNotIn(self.member.name, frappe.as_json(theirs))
		with self.as_user(self.second_member), self.assertRaises(frappe.PermissionError):
			frappe.get_list("GP Arcade Puzzle Result", fields=["seconds"])

		# Once they solve it too, both see both results, fastest first.
		theirs = self.solve(self.second_member, seconds=60, mistakes=0)
		self.assertEqual(
			[(r["user"], r["full_name"], r["seconds"], r["mistakes"]) for r in theirs["results"]],
			[
				(self.second_member.name, self.second_member.full_name, 60, 0),
				(self.member.name, self.member.full_name, 95, 2),
			],
		)
		# Solving yesterday's puzzle does not count as solving today's.
		self.assertEqual(self.open(self.member, 1)["results"], [])

		with self.assertRaises(frappe.PermissionError):
			self.open(self.guest)

	def test_the_server_refuses_wrong_grids_second_results_and_other_days(self):
		answer = puzzle_on(DAY_ONE)["rows"]
		wrong = ["." * 10] + answer[1:]
		for grid, seconds, mistakes in (
			(wrong, 95, 2),
			(answer[:9], 95, 2),
			(answer, -1, 2),
			(answer, 95, 101),
		):
			with self.assertRaises(frappe.ValidationError, msg=(grid, seconds, mistakes)):
				self.solve(self.member, grid, seconds, mistakes)
		with self.assertRaises(frappe.FrappeTypeError):
			self.solve(self.member, "not a grid")
		self.assertEqual(frappe.db.count("GP Arcade Puzzle Result"), 0)
		self.assertEqual(unlocks(self.member), [])

		self.solve(self.member, seconds=95, mistakes=2)
		with self.assertRaises(frappe.ValidationError):
			self.solve(self.member, seconds=10, mistakes=0)
		self.assertEqual(self.open(self.member)["result"], {"seconds": 95, "mistakes": 2})

		# A date more than a day from the server's is refused.
		with self.on_day(), self.as_user(self.member), self.assertRaises(frappe.ValidationError):
			submit_puzzle("2026-10-07", answer, 95, 2)

		# The next day brings the next puzzle.
		self.assertEqual(self.open(self.member, 1)["number"], self.open(self.member)["number"] + 1)


class TestPuzzleSet(GameplanTestCase):
	def test_every_puzzle_has_one_answer_and_unlocks_a_lockable_item(self):
		"""The set that `arcade/scripts/buildPuzzles.ts` writes. Its solver is ported here, so
		the check runs with the other backend tests and needs neither the pack nor Node."""
		puzzles = arcade_data("puzzles.json")
		self.assertGreaterEqual(len(puzzles), 40)
		lockable = lockable_items()
		items = [puzzle["item"] for puzzle in puzzles]
		self.assertEqual(len(set(items)), len(items), msg="an item is the answer to two puzzles")
		for puzzle in puzzles:
			item, rows = puzzle["item"], puzzle["rows"]
			self.assertIn(item, lockable, msg=item)
			self.assertEqual(lockable[item]["hint"], "Solve a daily puzzle", msg=item)
			self.assertEqual([len(row) for row in rows], [10] * 10, msg=item)
			self.assertTrue(set("".join(rows)) <= {"#", "."}, msg=item)
			self.assertTrue(solves_by_lines([[cell == "#" for cell in row] for row in rows]), msg=item)


def runs(line) -> tuple[int, ...]:
	out, run = [], 0
	for filled in [*line, False]:
		if filled:
			run += 1
		elif run:
			out.append(run)
			run = 0
	return tuple(out)


@cache
def placements(clue: tuple[int, ...], length: int) -> tuple[tuple[bool, ...], ...]:
	"""Every way to place the runs of `clue` in a line of `length` cells."""
	if not clue:
		return ((False,) * length,)
	first, rest = clue[0], clue[1:]
	rest_length = sum(rest) + len(rest)
	out = []
	for start in range(length - first - rest_length + 1):
		head = (False,) * start + (True,) * first
		if rest:
			out.extend(head + (False,) + tail for tail in placements(rest, length - len(head) - 1))
		else:
			out.append(head + (False,) * (length - len(head)))
	return tuple(out)


def solves_by_lines(answer: list[list[bool]]) -> bool:
	"""Solves the puzzle from its clues one line at a time: a cell is decided when every
	placement of its line's runs that fits the known cells agrees on it. True when that
	decides every cell, which also means the answer is the only one."""
	size = len(answer)
	clues = {
		True: [runs(row) for row in answer],
		False: [runs([row[x] for row in answer]) for x in range(size)],
	}
	known: list[list[bool | None]] = [[None] * size for _ in range(size)]
	changed = True
	while changed:
		changed = False
		for is_row in (True, False):
			for index in range(size):
				cells = [(index, at) if is_row else (at, index) for at in range(size)]
				current = [known[y][x] for y, x in cells]
				fits = [
					placement
					for placement in placements(clues[is_row][index], size)
					if all(c is None or c == value for c, value in zip(current, placement, strict=True))
				]
				if not fits:
					return False
				for at, (y, x) in enumerate(cells):
					if known[y][x] is None and all(p[at] == fits[0][at] for p in fits):
						known[y][x] = fits[0][at]
						changed = True
	return all(value is not None for row in known for value in row)
