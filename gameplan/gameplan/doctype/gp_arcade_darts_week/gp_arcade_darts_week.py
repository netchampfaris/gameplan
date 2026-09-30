# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""The result of one finished week of darts: its top score and everyone who reached it.

A daily job, `settle_weeks`, settles each week once it has ended in every timezone. It
records the week here and gives each winner the darts trophy with the source
`darts:<week>`. A player who already has the trophy gets nothing new, but the win is
still recorded, so the leaderboard can count each player's wins.

One document per week, named by the week (`2026-W40`), so a week is settled only once.
"""

from datetime import date

import frappe
from frappe.model.document import Document

from gameplan import arcade
from gameplan.gameplan.doctype.gp_arcade_dart_throw.gp_arcade_dart_throw import weekly_totals
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import grant_item

DARTS_TROPHY = "darts-trophy"


class GPArcadeDartsWeek(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from gameplan.gameplan.doctype.gp_arcade_darts_winner.gp_arcade_darts_winner import (
			GPArcadeDartsWinner,
		)

		top_score: DF.Int
		week: DF.Data
		winners: DF.Table[GPArcadeDartsWinner]
	# end: auto-generated types

	pass


def has_ended(week: str, today: date) -> bool:
	"""Whether nobody anywhere can still throw a dart in `week`, when the server's UTC
	date is `today`.

	`player_today` accepts a local date up to one day behind the UTC date, so the week's
	Sunday takes throws until the UTC date is two days past it.
	"""
	year, number = week.split("-W")
	sunday = date.fromisocalendar(int(year), int(number), 7)
	return (today - sunday).days > 1


def settle_weeks():
	"""Settle every week that has ended everywhere and is not settled yet. Runs daily."""
	today = arcade.utc_today()
	thrown = frappe.get_all("GP Arcade Dart Throw", pluck="week", distinct=True)
	settled = set(frappe.get_all("GP Arcade Darts Week", pluck="name"))
	for week in sorted(set(thrown) - settled):
		if has_ended(week, today):
			settle_week(week)


def settle_week(week: str) -> bool:
	"""Record the winners of `week` and give each of them the darts trophy.

	The winners are everyone with the best total, so a tie has several. A week whose best
	total is 0 has none. Returns False, changing nothing, if the week is already settled.
	"""
	if frappe.db.exists("GP Arcade Darts Week", week):
		return False
	totals = weekly_totals(week)
	top_score = max((int(row.total) for row in totals), default=0)
	winners = sorted(row.user for row in totals if top_score and row.total == top_score)
	record = frappe.new_doc("GP Arcade Darts Week", week=week, top_score=top_score)
	for user in winners:
		record.append("winners", {"user": user})
	record.insert(ignore_permissions=True)
	for user in winners:
		grant_item(user, DARTS_TROPHY, f"darts:{week}")
	return True
