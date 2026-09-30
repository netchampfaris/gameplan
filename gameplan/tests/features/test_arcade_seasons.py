# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Seasons: times of year when the Common Room is decorated and entering the Arcade
unlocks a few Home items.

The seasons live in `arcade/data/seasons.json`, which the client reads too. The client
sends only its local date to `claim_season_items`; the server works out the season from
it and grants that season's items once, with the source `season:<id>-<year>`.
"""

from datetime import date
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	active_season,
	claim_season_items,
	lockable_items,
	seasons,
)
from gameplan.tests.base import GameplanTestCase


def unlocked(user):
	if not frappe.db.exists("GP Arcade Profile", user.name):
		return []
	return sorted((row.item, row.source) for row in frappe.get_doc("GP Arcade Profile", user.name).unlocks)


class TestActiveSeason(GameplanTestCase):
	def test_the_season_on_each_day(self):
		expected = {
			# Halloween, the same days every year.
			"2026-10-19": None,
			"2026-10-20": ("halloween", 2026),
			"2026-11-01": ("halloween", 2026),
			"2026-11-02": None,
			# Diwali moves: only the years listed have one.
			"2026-11-04": None,
			"2026-11-05": ("diwali", 2026),
			"2026-11-12": ("diwali", 2026),
			"2026-11-13": None,
			"2027-11-08": None,
			# Christmas runs into the new year and keeps the year it started in.
			"2026-12-14": None,
			"2026-12-15": ("christmas", 2026),
			"2026-12-31": ("christmas", 2026),
			"2027-01-01": ("christmas", 2026),
			"2027-01-02": None,
			"2026-01-01": ("christmas", 2025),
			"2026-09-30": None,
			"2028-02-29": None,
		}
		for day, season in expected.items():
			self.assertEqual(active_season(date.fromisoformat(day)), season, msg=day)

	def test_every_season_item_is_lockable_with_a_hint_naming_the_season(self):
		lockable = lockable_items()
		for season in seasons().values():
			self.assertTrue(season["items"], msg=season["name"])
			for item in season["items"]:
				self.assertEqual(lockable.get(item), {"hint": f"Visit during {season['name']}"}, msg=item)


class TestClaimSeasonItems(GameplanTestCase):
	def claim(self, user, today, utc_today=None):
		utc = date.fromisoformat(utc_today or today)
		with self.as_user(user), patch("gameplan.arcade.utc_today", return_value=utc):
			return claim_season_items(today)

	def test_entering_during_a_season_unlocks_its_items_once(self):
		halloween = seasons()["halloween"]["items"]
		with patch("frappe.realtime.publish_realtime") as publish:
			self.assertEqual(self.claim(self.member, "2026-10-31"), halloween)
			# Every visit claims again; nothing more is granted and nobody is told twice.
			self.assertEqual(self.claim(self.member, "2026-11-01"), [])
		self.assertEqual(publish.call_count, len(halloween))
		self.assertEqual(unlocked(self.member), sorted((item, "season:halloween-2026") for item in halloween))

		# New Year's Day belongs to the Christmas that started the year before.
		self.claim(self.member, "2027-01-01")
		self.assertIn(("christmas-tree", "season:christmas-2026"), unlocked(self.member))

	def test_outside_a_season_nothing_is_granted(self):
		self.assertEqual(self.claim(self.member, "2026-09-30"), [])
		self.assertEqual(unlocked(self.member), [])

	def test_the_date_must_be_today_for_the_player(self):
		# A client cannot pick a season by sending its date.
		with self.assertRaises(frappe.ValidationError):
			self.claim(self.member, "2026-10-31", utc_today="2026-09-30")
		self.assertEqual(unlocked(self.member), [])

	def test_gameplan_guests_cannot_claim(self):
		with self.assertRaises(frappe.PermissionError):
			self.claim(self.guest, "2026-10-31")
