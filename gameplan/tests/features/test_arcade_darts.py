# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Darts in the Common Room, with a weekly leaderboard.

Each player throws 3 darts per local day. Their score for a week is the sum of their darts
in the ISO week of their local date. Once a week has ended in every timezone, a daily job
records its winners and gives each of them the darts trophy.
"""

from contextlib import contextmanager
from datetime import date, timedelta
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_dart_throw.gp_arcade_dart_throw import (
	get_darts,
	throw_dart,
	week_of,
)
from gameplan.gameplan.doctype.gp_arcade_darts_week.gp_arcade_darts_week import (
	settle_week,
	settle_weeks,
)
from gameplan.tests.base import GameplanTestCase

# A Wednesday in 2026-W41, which runs from Monday 5 October to Sunday 11 October.
WEDNESDAY = date(2026, 10, 7)
WEEK = "2026-W41"
SUNDAY = date(2026, 10, 11)


def unlocks(user) -> list[tuple[str, str]]:
	if not frappe.db.exists("GP Arcade Profile", user.name):
		return []
	return [(row.item, row.source) for row in frappe.get_doc("GP Arcade Profile", user.name).unlocks]


class TestDarts(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Rolled back with the rest of the test.
		frappe.db.delete("GP Arcade Dart Throw")
		frappe.db.delete("GP Arcade Darts Week")
		frappe.db.delete("GP Arcade Darts Winner")

	@contextmanager
	def on(self, day: date):
		"""The server's UTC date is `day`, and so is the player's."""
		with patch("gameplan.arcade.utc_today", return_value=day):
			yield day.isoformat()

	def throw(self, user, *scores: int, day: date = WEDNESDAY) -> dict:
		status = {}
		with self.on(day) as today, self.as_user(user):
			for score in scores:
				status = throw_dart(today, score)
		return status

	def open(self, user, day: date = WEDNESDAY) -> dict:
		with self.on(day) as today, self.as_user(user):
			return get_darts(today)

	def settle_on(self, day: date):
		with self.on(day), patch("frappe.realtime.publish_realtime") as publish:
			settle_weeks()
		return publish

	def test_three_darts_a_day_add_up_over_the_week(self):
		fresh = self.open(self.member)
		self.assertEqual(
			(fresh["week"], fresh["today"], fresh["standings"], fresh["last_week"]), (WEEK, [], [], None)
		)

		status = self.throw(self.member, 60, 25, 0)
		self.assertEqual(status["today"], [60, 25, 0])
		# A 4th dart, and a score no dart can make, are refused.
		for score in (20, 59):
			with self.assertRaises(frappe.ValidationError):
				self.throw(self.member, score)
		self.assertEqual(frappe.db.count("GP Arcade Dart Throw", {"user": self.member.name}), 3)

		# The next day brings 3 more darts, in the same week.
		self.throw(self.member, 3, day=WEDNESDAY + timedelta(days=1))
		self.throw(self.second_member, 50, 50)
		standings = self.open(self.second_member)["standings"]
		self.assertEqual(
			[(row["user"], row["full_name"], row["total"], row["throws"], row["wins"]) for row in standings],
			[
				(self.second_member.name, self.second_member.full_name, 100, 2, 0),
				(self.member.name, self.member.full_name, 88, 4, 0),
			],
		)

		# Throws are read only through `get_darts`, and only members can play.
		with self.as_user(self.member), self.assertRaises(frappe.PermissionError):
			frappe.get_list("GP Arcade Dart Throw", fields=["score"])
		with self.assertRaises(frappe.PermissionError):
			self.open(self.guest)

	def test_the_week_is_the_iso_week_of_the_local_date(self):
		self.assertEqual(week_of(date(2025, 12, 29)), "2026-W01")
		self.assertEqual(week_of(date(2026, 12, 31)), "2026-W53")
		self.assertEqual(week_of(date(2027, 1, 1)), "2026-W53")
		self.assertEqual(week_of(date(2027, 1, 3)), "2026-W53")
		self.assertEqual(week_of(date(2027, 1, 4)), "2027-W01")

		# New Year's Eve and New Year's Day are one week on the leaderboard.
		self.throw(self.member, 20, day=date(2026, 12, 31))
		self.throw(self.member, 40, day=date(2027, 1, 1))
		status = self.open(self.member, date(2027, 1, 1))
		self.assertEqual(status["week"], "2026-W53")
		self.assertEqual([(row["total"], row["throws"]) for row in status["standings"]], [(60, 2)])
		self.assertEqual(self.open(self.member, date(2027, 1, 4))["standings"], [])

	def test_a_tie_gives_every_leader_the_trophy(self):
		self.throw(self.member, 60, 60, 1)
		self.throw(self.second_member, 50, 50, 21)
		self.throw(self.admin, 60, 60)

		publish = self.settle_on(SUNDAY + timedelta(days=2))
		self.assertEqual(publish.call_count, 2)
		for user in (self.member, self.second_member):
			self.assertEqual(unlocks(user), [("darts-trophy", f"darts:{WEEK}")])
		self.assertEqual(unlocks(self.admin), [])

		last_week = self.open(self.member, SUNDAY + timedelta(days=2))["last_week"]
		self.assertEqual((last_week["week"], last_week["settled"], last_week["top_score"]), (WEEK, True, 121))
		self.assertEqual(
			[(row["user"], row["wins"]) for row in last_week["winners"]],
			sorted([(self.member.name, 1), (self.second_member.name, 1)]),
		)

	def test_a_week_is_settled_only_after_it_has_ended_everywhere(self):
		self.throw(self.member, 60, day=SUNDAY)
		# On Sunday and Monday (UTC), someone far west can still be on Sunday.
		for day in (SUNDAY, SUNDAY + timedelta(days=1)):
			self.settle_on(day)
			self.assertFalse(frappe.db.exists("GP Arcade Darts Week", WEEK), msg=day)
			# Until then, the leaders so far show as last week's, not yet settled.
			last_week = self.open(self.member, day + timedelta(days=1))["last_week"]
			self.assertEqual((last_week["settled"], last_week["top_score"]), (False, 60))
		self.assertEqual(unlocks(self.member), [])

		self.settle_on(SUNDAY + timedelta(days=2))
		self.assertTrue(frappe.db.exists("GP Arcade Darts Week", WEEK))
		self.assertEqual(unlocks(self.member), [("darts-trophy", f"darts:{WEEK}")])

	def test_settling_twice_does_nothing_and_a_second_win_still_counts(self):
		self.throw(self.member, 60)
		self.assertTrue(settle_week(WEEK))
		self.assertFalse(settle_week(WEEK))
		publish = self.settle_on(SUNDAY + timedelta(days=9))
		publish.assert_not_called()
		self.assertEqual(frappe.db.count("GP Arcade Darts Winner"), 1)

		# Winning the next week records the win, but the trophy is already in the Collection.
		next_week = WEDNESDAY + timedelta(days=7)
		self.throw(self.member, 5, day=next_week)
		self.settle_on(SUNDAY + timedelta(days=9))
		self.assertEqual(unlocks(self.member), [("darts-trophy", f"darts:{WEEK}")])
		standings = self.open(self.member, next_week)["standings"]
		self.assertEqual([row["wins"] for row in standings], [2])

		# A week nobody scored in has no winners.
		self.throw(self.second_member, 0, day=next_week + timedelta(days=7))
		self.settle_on(SUNDAY + timedelta(days=16))
		self.assertEqual(frappe.db.count("GP Arcade Darts Winner"), 2)
