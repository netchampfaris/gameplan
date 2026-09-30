# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""The shared plant: one plant in the Common Room that everyone grows by watering it.

A player waters it once per local day. It grows a stage for each distinct day someone
watered it, droops after three days without water, and blooms at full growth. Blooming
gives a cutting to everyone who watered it that cycle, and the next day a new cycle
starts with the next species.
"""

from contextlib import contextmanager
from datetime import date, timedelta
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_plant.gp_arcade_plant import (
	STAGES,
	get_plant,
	species_list,
	water_plant,
)
from gameplan.tests.base import GameplanTestCase

DAY_ONE = date(2026, 10, 5)


def unlocked(user):
	if not frappe.db.exists("GP Arcade Profile", user.name):
		return []
	return [(row.item, row.source) for row in frappe.get_doc("GP Arcade Profile", user.name).unlocks]


class TestArcadePlant(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Rolled back with the rest of the test.
		frappe.db.delete("GP Arcade Plant")
		frappe.db.delete("GP Arcade Plant Watering")

	@contextmanager
	def on_day(self, offset: int):
		"""Run a block on DAY_ONE + `offset`, as the server's clock and the player's date."""
		day = DAY_ONE + timedelta(days=offset)
		with patch("gameplan.arcade.utc_today", return_value=day):
			yield day.isoformat()

	def water(self, user, offset: int) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return water_plant(today)

	def look(self, user, offset: int) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return get_plant(today)

	def test_grows_one_stage_per_watered_day_and_once_per_player_per_day(self):
		plant = self.look(self.member, 0)
		self.assertEqual((plant["cycle"], plant["stage"], plant["stages"]), (1, 1, STAGES))
		self.assertEqual(plant["species"], species_list()[0])
		self.assertEqual(plant["watered_today"], [])

		plant = self.water(self.member, 0)
		self.assertEqual(plant["stage"], 2)
		self.assertTrue(plant["watered_by_me"])
		self.assertEqual([p["user"] for p in plant["watered_today"]], [self.member.name])

		with self.assertRaises(frappe.ValidationError):
			self.water(self.member, 0)

		# A second player on the same day does not add a stage, but shows up as a waterer.
		plant = self.water(self.second_member, 0)
		self.assertEqual(plant["stage"], 2)
		self.assertEqual(
			[p["user"] for p in plant["watered_today"]], [self.member.name, self.second_member.name]
		)
		self.assertFalse(self.look(self.admin, 0)["watered_by_me"])

		# The next day is a new day: the list is empty and watering grows it again.
		plant = self.look(self.member, 1)
		self.assertEqual((plant["stage"], plant["watered_today"], plant["watered_by_me"]), (2, [], False))
		self.assertEqual(self.water(self.member, 1)["stage"], 3)

		# Guests of Gameplan cannot enter the Arcade, so they cannot water it.
		with self.assertRaises(frappe.PermissionError):
			self.water(self.guest, 1)

	def test_droops_after_three_days_without_water_and_revives_without_losing_a_stage(self):
		self.water(self.member, 0)
		self.water(self.member, 1)

		self.assertFalse(self.look(self.member, 3)["drooping"])
		plant = self.look(self.member, 4)
		self.assertTrue(plant["drooping"])
		self.assertEqual(plant["stage"], 3)
		self.assertTrue(self.look(self.member, 30)["drooping"])

		plant = self.water(self.second_member, 30)
		self.assertFalse(plant["drooping"])
		self.assertEqual(plant["stage"], 4)

	def test_blooms_at_full_growth_and_gives_cuttings_to_its_waterers_only(self):
		first, second = species_list()[0], species_list()[1]
		self.water(self.member, 0)
		self.water(self.member, 1)
		self.water(self.member, 2)
		self.assertFalse(self.look(self.member, 2)["bloomed"])

		with patch("frappe.realtime.publish_realtime") as publish:
			plant = self.water(self.second_member, 3)
		self.assertEqual((plant["stage"], plant["bloomed"], plant["drooping"]), (STAGES, True, False))
		self.assertEqual(unlocked(self.member), [(first["item"], "plant:1")])
		self.assertEqual(unlocked(self.second_member), [(first["item"], "plant:1")])
		self.assertEqual(unlocked(self.admin), [])
		self.assertEqual(
			sorted(call.kwargs["user"] for call in publish.call_args_list),
			sorted([self.member.name, self.second_member.name]),
		)

		# It stays in bloom for the rest of the day, and cannot be watered.
		with self.assertRaises(frappe.ValidationError):
			self.water(self.admin, 3)
		self.assertTrue(self.look(self.admin, 3)["bloomed"])

		# The next day a new cycle sprouts, with the next species. A bloomed plant
		# never droops, and the sprout counts its days from the bloom.
		plant = self.look(self.admin, 4)
		self.assertEqual((plant["cycle"], plant["stage"], plant["bloomed"]), (2, 1, False))
		self.assertEqual(plant["species"], second)
		self.assertTrue(self.look(self.admin, 6)["drooping"])

		plant = self.water(self.admin, 6)
		self.assertEqual((plant["cycle"], plant["stage"], plant["drooping"]), (2, 2, False))
		self.assertEqual(frappe.db.count("GP Arcade Plant"), 2)
		self.assertEqual(unlocked(self.admin), [])
