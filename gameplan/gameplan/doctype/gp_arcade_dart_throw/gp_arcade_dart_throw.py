# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A dart a player threw at the dartboard in the Common Room.

Each player has 3 darts per local day. The client aims each dart and works out its score;
cheating is harmless in a game for one team, so the server checks only that the score is
one a dart can make and that the player has a dart left today.

A player's score for a week is the sum of their throws in the ISO week of their local
date, so at most 21 throws: 3 a day for 7 days. `GP Arcade Darts Week` records each
finished week's winners.

One document per dart, named `<day> <user> <n>` with n from 1 to 3, so the database
refuses a second dart with the same number even when two requests arrive at once.
"""

from datetime import date, timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import Count, Sum

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import check_arcade_access

THROWS_PER_DAY = 3
# Every score one dart can make: a miss, a single, double or triple of 1 to 20, the outer
# bull (25) and the bull (50).
DART_SCORES = frozenset({0, 25, 50} | {number * ring for number in range(1, 21) for ring in (1, 2, 3)})


class GPArcadeDartThrow(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		day: DF.Date
		number: DF.Int
		score: DF.Int
		user: DF.Link
		week: DF.Data
	# end: auto-generated types

	def autoname(self):
		self.name = f"{frappe.utils.getdate(self.day).isoformat()} {self.user} {self.number}"


def week_of(day: date) -> str:
	"""The ISO week `day` falls in, like `2026-W40`. Weeks start on Monday, and the first
	week of a year is the one with its first Thursday, so 1 January can be in the last
	week of the year before."""
	year, week, _weekday = day.isocalendar()
	return f"{year}-W{week:02d}"


def throws_on(day: date, user: str) -> list[int]:
	"""The scores of `user`'s darts on `day`, in the order they threw them."""
	return frappe.get_all(
		"GP Arcade Dart Throw",
		filters={"user": user, "day": day},
		pluck="score",
		order_by="number asc",
	)


def weekly_totals(week: str) -> list[dict]:
	"""Each player who threw in `week`, with `total` (the sum of their scores) and `throws`."""
	throw = frappe.qb.DocType("GP Arcade Dart Throw")
	return (
		frappe.qb.from_(throw)
		.select(throw.user, Sum(throw.score).as_("total"), Count(throw.name).as_("throws"))
		.where(throw.week == week)
		.groupby(throw.user)
		.run(as_dict=True)
	)


def wins_of(users: list[str]) -> dict[str, int]:
	"""How many weeks each of `users` has won, counting ties. Users with no wins are left out."""
	if not users:
		return {}
	winner = frappe.qb.DocType("GP Arcade Darts Winner")
	rows = (
		frappe.qb.from_(winner)
		.select(winner.user, Count(winner.name).as_("wins"))
		.where((winner.parenttype == "GP Arcade Darts Week") & winner.user.isin(users))
		.groupby(winner.user)
		.run(as_dict=True)
	)
	return {row.user: row.wins for row in rows}


def players(users: list[str]) -> dict[str, dict]:
	"""The name, look and win count of each user, for a leaderboard."""
	users = users or [""]
	names = dict(
		frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name"], as_list=True)
	)
	appearances = dict(
		frappe.get_all(
			"GP Arcade Profile", filters={"user": ["in", users]}, fields=["user", "appearance"], as_list=True
		)
	)
	wins = wins_of(users)
	return {
		user: {
			"user": user,
			"full_name": names.get(user) or user,
			"appearance": frappe.parse_json(appearances[user]) if appearances.get(user) else None,
			"wins": wins.get(user, 0),
		}
		for user in users
	}


def standings(week: str) -> list[dict]:
	"""Everyone who threw in `week`, best total first. A tie goes to fewer darts thrown."""
	totals = sorted(weekly_totals(week), key=lambda row: (-row.total, row.throws, row.user))
	people = players([row.user for row in totals])
	return [{**people[row.user], "total": int(row.total), "throws": row.throws} for row in totals]


def week_result(week: str) -> dict | None:
	"""The winners of `week`, or None if nobody threw in it.

	A settled week reads its record in `GP Arcade Darts Week`. Until the job settles it,
	the winners are the leaders so far, marked `settled: False`: a late throw from the
	other side of the world can still change them.
	"""
	settled = frappe.db.get_value("GP Arcade Darts Week", week, "top_score")
	if settled is not None:
		winners = frappe.get_all(
			"GP Arcade Darts Winner",
			filters={"parenttype": "GP Arcade Darts Week", "parent": week},
			pluck="user",
			order_by="idx asc",
		)
		top_score = settled
	else:
		totals = weekly_totals(week)
		if not totals:
			return None
		top_score = max(int(row.total) for row in totals)
		winners = sorted(row.user for row in totals if top_score and row.total == top_score)
	people = players(winners)
	return {
		"week": week,
		"settled": settled is not None,
		"top_score": top_score,
		"winners": [people[user] for user in winners],
	}


def darts_status(day: date) -> dict:
	"""Darts for the session user on their local `day`: their darts today, this week's
	leaderboard and last week's winners."""
	return {
		"day": day.isoformat(),
		"week": week_of(day),
		"throws_per_day": THROWS_PER_DAY,
		"today": throws_on(day, frappe.session.user),
		"standings": standings(week_of(day)),
		"last_week": week_result(week_of(day - timedelta(days=7))),
	}


@frappe.whitelist()
def get_darts(today: str):
	"""Darts on the player's local `today`: their scores today, this week's leaderboard and
	last week's winners."""
	check_arcade_access()
	return darts_status(player_today(today))


@frappe.whitelist(methods=["POST"])
def throw_dart(today: str, score: int):
	"""Record one dart for the player's local `today`. Refused when the score is not one a
	dart can make, or when the player has thrown all of today's darts."""
	check_arcade_access()
	day = player_today(today)
	if score not in DART_SCORES:
		frappe.throw(_("A dart cannot score {0}").format(score), frappe.ValidationError)

	user = frappe.session.user
	thrown = len(throws_on(day, user))
	if thrown >= THROWS_PER_DAY:
		frappe.throw(_("You have thrown all your darts today. Come back tomorrow."), frappe.ValidationError)
	frappe.new_doc(
		"GP Arcade Dart Throw",
		user=user,
		day=day,
		week=week_of(day),
		number=thrown + 1,
		score=score,
	).insert(ignore_permissions=True)
	return darts_status(day)
