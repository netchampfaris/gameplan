# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Birthdays and work anniversaries.

A player may share a birthday (day and month) and a work anniversary (day and month, with
an optional start year) on their GP Arcade Profile. On that day the Common Room throws a
party: everyone can add one candle to the celebrant's cake, and the celebrant unlocks a
Home item. Nobody else can read the dates; they only see the party.
"""

from contextlib import contextmanager
from datetime import date
from unittest.mock import patch

import frappe
from frappe.api.v1 import read_doc
from frappe.client import get_value

from gameplan.gameplan.doctype.gp_arcade_candle.gp_arcade_candle import add_candle, get_celebrations
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	celebrations_on,
	claim_celebration_items,
	get_dates,
	set_dates,
)
from gameplan.tests.base import GameplanTestCase

DATE_FIELDS = ("birthday", "work_anniversary", "work_start_year")


class TestArcadeCelebrations(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Other people on the site may have a party today. Rolled back after the test.
		frappe.db.sql(
			"update `tabGP Arcade Profile` set birthday=null, work_anniversary=null, work_start_year=0"
		)
		frappe.db.delete("GP Arcade Candle")

	@contextmanager
	def on(self, day: str, user):
		"""Run a block as `user` on `day`, as both the server's clock and the player's date."""
		with patch("gameplan.arcade.utc_today", return_value=date.fromisoformat(day)), self.as_user(user):
			yield day

	def set_dates(self, user, **dates):
		with self.on("2026-09-30", user):
			return set_dates(**dates)

	def party(self, day: str, user) -> list[dict]:
		with self.on(day, user):
			return get_celebrations(day)["celebrations"]

	def test_a_party_on_the_day_and_on_february_28_for_a_leap_day(self):
		self.set_dates(self.member, birthday="02-29")
		self.set_dates(self.second_member, work_anniversary="03-01", work_start_year=2020)

		def who(day):
			return [
				(row["full_name"], row["occasion"], row["years"])
				for row in celebrations_on(date.fromisoformat(day))
			]

		# A leap-day birthday is on February 28 in other years, and on February 29 in leap years.
		self.assertEqual(who("2027-02-28"), [("Member", "birthday", None)])
		self.assertEqual(who("2028-02-28"), [])
		self.assertEqual(who("2028-02-29"), [("Member", "birthday", None)])
		self.assertEqual(who("2027-03-01"), [("Second Member", "anniversary", 7)])
		self.assertEqual(who("2026-09-30"), [])

		# Birthdays come first. Without a start year, the years are not counted.
		self.set_dates(self.member, birthday="03-01")
		self.set_dates(self.second_member, work_anniversary="03-01")
		self.assertEqual(
			who("2027-03-01"), [("Member", "birthday", None), ("Second Member", "anniversary", None)]
		)

	def test_dates_are_checked_and_can_be_cleared(self):
		for dates in ({"birthday": "02-30"}, {"birthday": "1990-05-04"}, {"work_anniversary": "13-01"}):
			with self.assertRaises(frappe.ValidationError, msg=dates):
				self.set_dates(self.member, **dates)
		with self.assertRaises(frappe.ValidationError):
			self.set_dates(self.member, work_anniversary="05-04", work_start_year=2027)

		self.assertEqual(
			self.set_dates(self.member, birthday="05-04", work_anniversary="06-01", work_start_year="2021"),
			{"birthday": "05-04", "work_anniversary": "06-01", "work_start_year": 2021},
		)
		# Clearing the anniversary clears its start year too.
		self.assertEqual(
			self.set_dates(self.member, birthday="", work_anniversary=None, work_start_year=2021),
			{"birthday": None, "work_anniversary": None, "work_start_year": None},
		)

	def test_one_candle_per_person_and_only_the_celebrant_sees_who(self):
		self.set_dates(self.member, birthday="10-01")

		with self.on("2026-10-01", self.second_member) as today:
			party = add_candle(today, self.member.name, "birthday")["celebrations"]
			self.assertEqual(
				[(row["candles"], row["candled"], row["candles_from"]) for row in party], [(1, True, [])]
			)
			with self.assertRaisesRegex(frappe.ValidationError, "already added a candle"):
				add_candle(today, self.member.name, "birthday")
			# Only on the day, and only for the occasion being celebrated.
			with self.assertRaises(frappe.ValidationError):
				add_candle(today, self.member.name, "anniversary")
		with self.on("2026-10-02", self.second_member) as today, self.assertRaises(frappe.ValidationError):
			add_candle(today, self.member.name, "birthday")

		with self.on("2026-10-01", self.admin) as today:
			add_candle(today, self.member.name, "birthday")

		(mine,) = self.party("2026-10-01", self.member)
		self.assertEqual((mine["candles"], mine["candled"]), (2, False))
		self.assertEqual(
			[entry["full_name"] for entry in mine["candles_from"]], ["Second Member", self.admin.full_name]
		)
		(theirs,) = self.party("2026-10-01", self.outsider)
		self.assertEqual((theirs["candles"], theirs["candled"], theirs["candles_from"]), (2, False, []))

		# Gameplan guests are not in the Arcade.
		with self.on("2026-10-01", self.guest) as today, self.assertRaises(frappe.PermissionError):
			add_candle(today, self.member.name, "birthday")

	def test_the_celebrant_unlocks_an_item_on_their_day(self):
		self.set_dates(self.member, birthday="10-01", work_anniversary="10-01", work_start_year=2023)

		def claim(day, user=self.member):
			with self.on(day, user), patch("frappe.realtime.publish_realtime"):
				return claim_celebration_items(day)

		self.assertEqual(claim("2026-09-30"), [])
		self.assertEqual(claim("2026-10-01", self.second_member), [])
		self.assertEqual(claim("2026-10-01"), ["birthday-cake", "anniversary-plaque"])
		self.assertEqual(claim("2026-10-01"), [])
		unlocks = frappe.get_doc("GP Arcade Profile", self.member.name).unlocks
		self.assertEqual(
			sorted((row.item, row.source) for row in unlocks),
			[("anniversary-plaque", "anniversary:2026"), ("birthday-cake", "birthday:2026")],
		)

		# The date must be the player's today, so nobody claims their day early.
		with (
			patch("gameplan.arcade.utc_today", return_value=date(2026, 9, 1)),
			self.as_user(self.second_member),
			self.assertRaises(frappe.ValidationError),
		):
			claim_celebration_items("2026-10-01")

	def test_nobody_else_can_read_the_dates(self):
		self.set_dates(self.member, birthday="10-01", work_anniversary="06-01", work_start_year=2020)

		with self.as_user(self.second_member):
			doc = read_doc("GP Arcade Profile", self.member.name).as_dict()
			self.assertFalse(any(doc.get(field) for field in DATE_FIELDS), doc)
			rows = frappe.get_list(
				"GP Arcade Profile", filters={"user": self.member.name}, fields=["name", *DATE_FIELDS]
			)
			self.assertFalse(any(row.get(field) for row in rows for field in DATE_FIELDS), rows)
			# Filtering on a date must not reveal it either.
			with self.assertRaises(frappe.PermissionError):
				frappe.get_list("GP Arcade Profile", filters={"birthday": "10-01"}, pluck="name")
			self.assertFalse(
				(get_value("GP Arcade Profile", "birthday", {"name": self.member.name}) or {}).get("birthday")
			)
			self.assertEqual(
				get_dates(), {"birthday": None, "work_anniversary": None, "work_start_year": None}
			)

			# Nor can anyone set them through an ordinary save of their own profile.
			own = frappe.get_doc({"doctype": "GP Arcade Profile", "user": self.second_member.name})
			own.birthday = "01-01"
			own.insert()
			self.assertIsNone(frappe.db.get_value("GP Arcade Profile", self.second_member.name, "birthday"))

		with self.as_user(self.member):
			self.assertEqual(
				get_dates(), {"birthday": "10-01", "work_anniversary": "06-01", "work_start_year": 2020}
			)
			# Saving the look keeps the dates.
			profile = frappe.get_doc("GP Arcade Profile", self.member.name)
			profile.guestbook_read_at = frappe.utils.now_datetime()
			profile.save()
		self.assertEqual(frappe.db.get_value("GP Arcade Profile", self.member.name, "birthday"), "10-01")
