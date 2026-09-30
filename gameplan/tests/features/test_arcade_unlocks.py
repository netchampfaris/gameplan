# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""The Collection: lockable Home items a player unlocks by playing.

Server code grants an item with `grant_item`, which records it once per user, creates the
profile if needed and tells the player's tabs. A client cannot grant itself anything,
whatever it sends when it saves its profile. `player_today` is the shared check on the
local date a client sends for daily features.
"""

import os
from datetime import date, datetime, timezone
from unittest.mock import patch

import frappe

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	ITEM_UNLOCKED,
	grant_item,
	lockable_items,
)
from gameplan.tests.base import GameplanTestCase

PROFILE_MODULE = "gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile"
LOCKABLE = {"pumpkin-lantern": {"hint": "Visit during Halloween"}}
HOME = {
	"wallpaper": "cream",
	"floor": "golden-wood",
	"items": [{"prefab": "pumpkin-lantern", "x": 4, "y": 5}],
}


def unlocked(user):
	return [(row.item, row.source) for row in frappe.get_doc("GP Arcade Profile", user.name).unlocks]


class TestArcadeUnlocks(GameplanTestCase):
	def setUp(self):
		super().setUp()
		lockable = patch(f"{PROFILE_MODULE}.lockable_items", return_value=LOCKABLE)
		lockable.start()
		self.addCleanup(lockable.stop)

	def test_grant_unlocks_an_item_once_and_tells_the_player(self):
		self.assertFalse(frappe.db.exists("GP Arcade Profile", self.member.name))

		with patch("frappe.realtime.publish_realtime") as publish:
			self.assertTrue(grant_item(self.member.name, "pumpkin-lantern", "season:halloween-2026"))
			# Already unlocked, from any source: nothing changes and nobody is told again.
			self.assertFalse(grant_item(self.member.name, "pumpkin-lantern", "puzzle:2026-10-03"))

		self.assertEqual(unlocked(self.member), [("pumpkin-lantern", "season:halloween-2026")])
		publish.assert_called_once_with(
			ITEM_UNLOCKED,
			message={"item": "pumpkin-lantern", "source": "season:halloween-2026"},
			user=self.member.name,
			after_commit=True,
		)
		# Only that user has it.
		self.assertFalse(frappe.db.exists("GP Arcade Profile", self.second_member.name))

	def test_grant_accepts_only_lockable_items_and_well_formed_sources(self):
		for item, source in (
			("couch-gray", "season:halloween-2026"),
			("pumpkin-lantern", "halloween"),
			("pumpkin-lantern", "Season:halloween"),
			("pumpkin-lantern", "season:halloween 2026"),
		):
			with self.assertRaises(frappe.ValidationError, msg=(item, source)):
				grant_item(self.member.name, item, source)
		self.assertTrue(grant_item(self.member.name, "pumpkin-lantern", "darts:2026-W41"))

	def test_a_client_cannot_grant_itself_items(self):
		row = {
			"item": "pumpkin-lantern",
			"source": "season:halloween-2026",
			"unlocked_at": frappe.utils.now(),
		}
		with self.as_user(self.member), self.assertRaises(frappe.PermissionError):
			frappe.get_doc(
				{"doctype": "GP Arcade Profile", "user": self.member.name, "unlocks": [row]}
			).insert()

		with self.as_user(self.member):
			frappe.get_doc({"doctype": "GP Arcade Profile", "user": self.member.name}).insert()
			profile = frappe.get_doc("GP Arcade Profile", self.member.name)
			profile.append("unlocks", row)
			with self.assertRaises(frappe.PermissionError):
				profile.save()

		grant_item(self.member.name, "pumpkin-lantern", "season:halloween-2026")
		with self.as_user(self.member):
			profile = frappe.get_doc("GP Arcade Profile", self.member.name)
			profile.unlocks = []
			with self.assertRaises(frappe.PermissionError):
				profile.save()

			# Saving the Home or the look, as the client does, keeps the Collection.
			profile = frappe.get_doc("GP Arcade Profile", self.member.name)
			profile.home = HOME
			profile.save()
		self.assertEqual(unlocked(self.member), [("pumpkin-lantern", "season:halloween-2026")])


class TestLockableItems(GameplanTestCase):
	def test_every_lockable_item_is_a_catalog_item_with_a_hint(self):
		"""The list the client and the server share names real prefabs."""
		with open(
			os.path.join(frappe.get_app_path("gameplan"), "..", "arcade", "maps", "prefabs.ts")
		) as file:
			prefabs = file.read()
		for item, entry in lockable_items().items():
			self.assertIn(f"'{item}':", prefabs, msg=f"{item} is not in arcade/maps/prefabs.ts")
			self.assertIsInstance(entry.get("hint"), str, msg=item)
			self.assertTrue(entry["hint"], msg=item)


class TestPlayerToday(GameplanTestCase):
	def test_accepts_the_players_date_within_a_day_of_utc(self):
		with patch("gameplan.arcade.utc_today", return_value=date(2026, 10, 3)):
			for value in ("2026-10-02", "2026-10-03", "2026-10-04"):
				self.assertEqual(player_today(value), date.fromisoformat(value))
			for value in (
				"2026-10-01",
				"2026-10-05",
				"2026-10-3",
				"2026-02-30",
				"03-10-2026",
				"",
				None,
				20261003,
			):
				with self.assertRaises(frappe.ValidationError, msg=value):
					player_today(value)

		today = datetime.now(timezone.utc).date()
		self.assertEqual(player_today(today.isoformat()), today)
