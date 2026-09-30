# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""The question of the day on the Notice Board.

Everyone with the same local date gets the same question. A player answers once per
day, may change it that day, and sees the others' answers only after answering.
"""

from contextlib import contextmanager
from datetime import date, timedelta
from unittest.mock import patch

import frappe

from gameplan.gameplan.doctype.gp_arcade_answer.gp_arcade_answer import (
	MAX_ANSWER_LENGTH,
	answer_question,
	get_question,
	question_on,
)
from gameplan.tests.base import GameplanTestCase

DAY_ONE = date(2026, 10, 5)


class TestQuestionOfTheDay(GameplanTestCase):
	def setUp(self):
		super().setUp()
		# Rolled back with the rest of the test.
		frappe.db.delete("GP Arcade Answer")

	@contextmanager
	def on_day(self, offset: int = 0):
		day = DAY_ONE + timedelta(days=offset)
		with patch("gameplan.arcade.utc_today", return_value=day):
			yield day.isoformat()

	def ask(self, user, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return get_question(today)

	def answer(self, user, text: str, offset: int = 0) -> dict:
		with self.on_day(offset) as today, self.as_user(user):
			return answer_question(today, text)

	def test_others_answers_stay_hidden_until_you_answer(self):
		question = self.ask(self.member)
		self.assertEqual(question["question"], question_on(DAY_ONE))
		self.assertEqual((question["answer"], question["count"], question["answers"]), (None, 0, []))

		mine = self.answer(self.member, "  A cold brew  ")
		self.assertEqual(mine["answer"], "A cold brew")
		self.assertEqual([a["answer"] for a in mine["answers"]], ["A cold brew"])

		# The other player sees that someone answered, but not what.
		theirs = self.ask(self.second_member)
		self.assertEqual((theirs["answer"], theirs["count"], theirs["answers"]), (None, 1, []))
		self.assertNotIn("A cold brew", frappe.as_json(theirs))

		# Nor can they read the answers through the document API.
		with self.as_user(self.second_member):
			with self.assertRaises(frappe.PermissionError):
				frappe.get_list("GP Arcade Answer", fields=["answer"])
			with self.assertRaises(frappe.PermissionError):
				frappe.get_doc(
					"GP Arcade Answer", f"{DAY_ONE.isoformat()} {self.member.name}"
				).check_permission()

		theirs = self.answer(self.second_member, "Masala chai")
		self.assertEqual(
			[(a["user"], a["full_name"], a["answer"]) for a in theirs["answers"]],
			[
				(self.member.name, self.member.full_name, "A cold brew"),
				(self.second_member.name, self.second_member.full_name, "Masala chai"),
			],
		)
		# Yesterday's answers do not count as answering today.
		self.assertEqual(self.ask(self.second_member, 1)["answers"], [])

		with self.assertRaises(frappe.PermissionError):
			self.ask(self.guest)

	def test_one_answer_per_player_per_day_which_they_can_change_that_day(self):
		self.answer(self.member, "Coffee")
		changed = self.answer(self.member, "Tea, actually")
		self.assertEqual(changed["answer"], "Tea, actually")
		self.assertEqual(changed["count"], 1)
		self.assertEqual(frappe.db.count("GP Arcade Answer", {"user": self.member.name}), 1)

		for text in ("", "   ", "x" * (MAX_ANSWER_LENGTH + 1)):
			with self.assertRaises(frappe.ValidationError, msg=text):
				self.answer(self.member, text)
		self.assertEqual(self.ask(self.member)["answer"], "Tea, actually")

		# The next day brings a new question and a fresh answer.
		tomorrow = self.ask(self.member, 1)
		self.assertEqual(tomorrow["question"], question_on(DAY_ONE + timedelta(days=1)))
		self.assertNotEqual(tomorrow["question"], question_on(DAY_ONE))
		self.assertIsNone(tomorrow["answer"])

		# A date more than a day from the server's is refused.
		with self.on_day(), self.as_user(self.member), self.assertRaises(frappe.ValidationError):
			answer_question("2026-10-07", "Too early")
