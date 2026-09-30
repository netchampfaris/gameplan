# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""The team cat in the Common Room: a name the team picks and a favourite person.

Anyone can rename the cat once per local day. Petting counts once per player per local
day, and the player with the most counted days is its favourite; on a tie, the one who
got there first keeps it.
"""

from contextlib import contextmanager
from datetime import date, timedelta
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_cat_day.gp_arcade_cat_day import (
	MAX_NAME_LENGTH,
	get_cat,
	name_cat,
	pet_cat,
)
from gameplan.tests.base import GameplanTestCase

DAY_ONE = date(2026, 10, 5)


class TestArcadeCat(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Rolled back with the rest of the test.
		frappe.db.delete("GP Arcade Cat Day")

	@contextmanager
	def on_day(self, offset: int):
		"""Run a block on DAY_ONE + `offset`, as the server's clock and the player's date."""
		day = DAY_ONE + timedelta(days=offset)
		with patch("gameplan.arcade.utc_today", return_value=day):
			yield day.isoformat()

	def look(self, user, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return get_cat(today)

	def name(self, user, name: str, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return name_cat(today, name)

	def pet(self, user, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return pet_cat(today)

	def favourite(self, offset: int = 0) -> str | None:
		cat = self.look(self.member, offset)
		return cat["favourite"] and cat["favourite"]["user"]

	def test_anyone_renames_the_cat_once_a_day(self):
		cat = self.look(self.member)
		self.assertEqual((cat["name"], cat["named_by"], cat["named_today"]), (None, None, False))

		cat = self.name(self.member, "  Mochi   the  Cat ")
		self.assertEqual(cat["name"], "Mochi the Cat")
		self.assertEqual(cat["named_by"], {"user": self.member.name, "full_name": self.member.full_name})
		self.assertTrue(cat["named_today"])

		# A second rename on the same day is refused, and the name stays.
		with self.assertRaises(frappe.ValidationError):
			self.name(self.member, "Biscuit")
		self.assertEqual(self.look(self.member)["name"], "Mochi the Cat")

		# Someone else may still rename it that day; everyone sees the latest name.
		theirs = self.look(self.second_member)
		self.assertEqual((theirs["name"], theirs["named_today"]), ("Mochi the Cat", False))
		self.name(self.second_member, "Biscuit")
		cat = self.look(self.member)
		self.assertEqual((cat["name"], cat["named_by"]["user"]), ("Biscuit", self.second_member.name))

		# The next local day, the first player can rename it again.
		self.assertFalse(self.look(self.member, 1)["named_today"])
		self.assertEqual(self.name(self.member, "Mochi", 1)["name"], "Mochi")

		# A blank or too long name is refused, and does not use up the day.
		with self.assertRaises(frappe.ValidationError):
			self.name(self.second_member, "   ", 1)
		with self.assertRaises(frappe.ValidationError):
			self.name(self.second_member, "x" * (MAX_NAME_LENGTH + 1), 1)
		self.assertEqual(self.name(self.second_member, "Pixel", 1)["name"], "Pixel")

		# A date more than a day from the server's is not today.
		with patch("gameplan.arcade.utc_today", return_value=DAY_ONE), self.as_user(self.outsider):
			with self.assertRaises(frappe.ValidationError):
				name_cat((DAY_ONE + timedelta(days=3)).isoformat(), "Later")

		# Players only reach the cat's days through these methods, and guests not at all.
		with self.as_user(self.member):
			with self.assertRaises(frappe.PermissionError):
				frappe.get_list("GP Arcade Cat Day", fields=["cat_name"])
		with self.assertRaises(frappe.PermissionError):
			self.look(self.guest)

	def test_petting_counts_once_per_player_per_day(self):
		self.assertIsNone(self.favourite())

		for _ in range(3):
			cat = self.pet(self.member)
		self.assertTrue(cat["petted_today"])
		self.assertFalse(self.look(self.member, 1)["petted_today"])
		self.assertEqual(self.favourite(), self.member.name)
		self.assertEqual(frappe.db.count("GP Arcade Cat Day", {"user": self.member.name}), 1)

		# Two days of care beat one day of many pets.
		self.pet(self.second_member, 0)
		self.pet(self.second_member, 1)
		self.assertEqual(self.favourite(1), self.second_member.name)

		# Naming the cat is not petting it.
		self.name(self.member, "Mochi", 1)
		self.name(self.member, "Mochi", 2)
		self.assertEqual(self.favourite(2), self.second_member.name)

		# Petting after naming on the same day counts.
		self.pet(self.member, 2)
		self.pet(self.member, 3)
		self.assertEqual(self.favourite(3), self.member.name)

	def test_a_tie_keeps_whoever_got_there_first(self):
		self.pet(self.member, 0)
		self.pet(self.second_member, 0)
		# Both have one day; the member's came first.
		self.assertEqual(self.favourite(), self.member.name)

		self.pet(self.second_member, 1)
		self.assertEqual(self.favourite(1), self.second_member.name)

		# The member catches up to two days, but the second member got there first.
		self.pet(self.member, 1)
		self.assertEqual(self.favourite(1), self.second_member.name)

		# Pulling ahead takes the title.
		self.pet(self.member, 2)
		self.assertEqual(self.favourite(2), self.member.name)
		self.assertEqual(
			self.look(self.second_member, 2)["favourite"],
			{"user": self.member.name, "full_name": self.member.full_name},
		)
