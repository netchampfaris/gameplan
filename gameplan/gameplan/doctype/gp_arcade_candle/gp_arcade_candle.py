# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A candle someone added to a teammate's cake on their birthday or work anniversary.

On a player's day the Common Room shows a party corner with a cake, and anyone in the
Arcade can add one candle to it. The celebrant sees who added candles; everyone else sees
only how many. The doctype is for System Managers, so players read candles only through
`get_celebrations`.

One document per person per celebration, named `<occasion> <year> <celebrant> <user>`, so
the database refuses a second candle.
"""

from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	celebrations_on,
	check_arcade_access,
)


class GPArcadeCandle(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		celebrant: DF.Link
		occasion: DF.Literal["birthday", "anniversary"]  # noqa: F722, F821
		user: DF.Link
		year: DF.Int
	# end: auto-generated types

	def autoname(self):
		self.name = candle_name(self.occasion, self.year, self.celebrant, self.user)


def candle_name(occasion: str, year: int, celebrant: str, user: str) -> str:
	return f"{occasion} {year} {celebrant} {user}"


def party_on(day: date) -> dict:
	"""The celebrations on `day`, each with its candles, as the session user may see them.

	`candles` is how many there are and `candled` whether the session user added one.
	`candles_from` (who added one, their look and when, oldest first) is filled only for
	the celebrant.
	"""
	me = frappe.session.user
	celebrations = celebrations_on(day)
	candles = frappe.get_all(
		"GP Arcade Candle",
		filters={"year": day.year, "celebrant": ["in", [row["celebrant"] for row in celebrations] or [""]]},
		fields=["celebrant", "occasion", "user", "creation"],
		order_by="creation asc",
	)
	givers = [candle.user for candle in candles if candle.celebrant == me] or [""]
	names = dict(
		frappe.get_all("User", filters={"name": ["in", givers]}, fields=["name", "full_name"], as_list=True)
	)
	looks = dict(
		frappe.get_all(
			"GP Arcade Profile", filters={"user": ["in", givers]}, fields=["user", "appearance"], as_list=True
		)
	)
	result = []
	for row in celebrations:
		mine = [
			candle
			for candle in candles
			if candle.celebrant == row["celebrant"] and candle.occasion == row["occasion"]
		]
		result.append(
			{
				**row,
				"candles": len(mine),
				"candled": any(candle.user == me for candle in mine),
				"candles_from": [
					{
						"user": candle.user,
						"full_name": names.get(candle.user) or candle.user,
						"appearance": frappe.parse_json(looks[candle.user])
						if looks.get(candle.user)
						else None,
						"added_at": candle.creation,
					}
					for candle in mine
				]
				if row["celebrant"] == me
				else [],
			}
		)
	return {"day": day.isoformat(), "celebrations": result}


@frappe.whitelist()
def get_celebrations(today: str):
	"""Who is celebrating on the player's local `today`, with the candles on each cake."""
	check_arcade_access()
	return party_on(player_today(today))


@frappe.whitelist(methods=["POST"])
def add_candle(today: str, celebrant: str, occasion: str):
	"""Add the session user's candle to `celebrant`'s cake for `occasion` ("birthday" or
	"anniversary") on the player's local `today`. One candle per person per celebration."""
	check_arcade_access()
	day = player_today(today)
	user = frappe.session.user
	if not any(row["celebrant"] == celebrant and row["occasion"] == occasion for row in celebrations_on(day)):
		frappe.throw(_("There is nothing to celebrate here today"), frappe.ValidationError)
	if frappe.db.exists("GP Arcade Candle", candle_name(occasion, day.year, celebrant, user)):
		frappe.throw(_("You already added a candle"), frappe.ValidationError)
	candle = frappe.new_doc(
		"GP Arcade Candle", celebrant=celebrant, occasion=occasion, year=day.year, user=user
	)
	try:
		candle.insert(ignore_permissions=True)
	except frappe.DuplicateEntryError:
		# Two requests at once: the name is the lock.
		frappe.throw(_("You already added a candle"), frappe.ValidationError)
	return party_on(day)
