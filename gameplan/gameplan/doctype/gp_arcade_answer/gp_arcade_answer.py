# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A player's answer to the question of the day, shown on the Notice Board.

Everyone with the same local date gets the same question, picked from
`arcade/data/questions.json` by the date. A player answers once per day and may change
their answer that day. They see everyone else's answers only after they answer:
`get_question` leaves them out until then, and the doctype is for System Managers, so the
list API cannot reveal them either.

One document per player per day, named `<day> <user>`, so the database refuses a second.
"""

from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import arcade_data, check_arcade_access

MAX_ANSWER_LENGTH = 140


class GPArcadeAnswer(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		answer: DF.SmallText
		day: DF.Date
		question: DF.SmallText
		user: DF.Link
	# end: auto-generated types

	def autoname(self):
		self.name = answer_name(frappe.utils.getdate(self.day), self.user)

	def validate(self):
		self.answer = (self.answer or "").strip()
		if not self.answer:
			frappe.throw(_("Write an answer first"), frappe.ValidationError)
		if len(self.answer) > MAX_ANSWER_LENGTH:
			frappe.throw(
				_("Keep it to {0} characters").format(MAX_ANSWER_LENGTH),
				frappe.ValidationError,
			)


def answer_name(day: date, user: str) -> str:
	return f"{day.isoformat()} {user}"


def question_on(day: date) -> str:
	"""The question of the day: the same for everyone whose local date is `day`."""
	questions = arcade_data("questions.json")
	return questions[day.toordinal() % len(questions)]


def question_status(day: date) -> dict:
	"""The question on `day` for the session user, with everyone's answers only if they
	have answered too."""
	mine = frappe.db.get_value("GP Arcade Answer", answer_name(day, frappe.session.user), "answer")
	return {
		"day": day.isoformat(),
		"question": question_on(day),
		"answer": mine,
		"count": frappe.db.count("GP Arcade Answer", {"day": day}),
		"answers": answers_on(day) if mine is not None else [],
	}


def answers_on(day: date) -> list[dict]:
	answers = frappe.get_all(
		"GP Arcade Answer",
		filters={"day": day},
		fields=["user", "answer"],
		order_by="creation asc",
	)
	users = [row.user for row in answers] or [""]
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
			"answer": row.answer,
		}
		for row in answers
	]


@frappe.whitelist()
def get_question(today: str):
	"""The question on the player's local `today`, their answer (or null), how many have
	answered, and everyone's answers once they have answered themselves."""
	check_arcade_access()
	return question_status(player_today(today))


@frappe.whitelist(methods=["POST"])
def answer_question(today: str, answer: str):
	"""Answer the question on the player's local `today`, or change today's answer."""
	check_arcade_access()
	day = player_today(today)
	name = answer_name(day, frappe.session.user)
	if frappe.db.exists("GP Arcade Answer", name):
		doc = frappe.get_doc("GP Arcade Answer", name, for_update=True)
		doc.answer = answer
	else:
		doc = frappe.new_doc(
			"GP Arcade Answer", user=frappe.session.user, day=day, question=question_on(day), answer=answer
		)
	doc.save(ignore_permissions=True)
	return question_status(day)
