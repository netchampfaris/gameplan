# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""Server helpers that several Arcade features share."""

import re
from datetime import date, datetime, timezone

import frappe
from frappe import _

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def player_today(value: str) -> date:
	"""The player's "today", from the local date their client sends as `YYYY-MM-DD`.

	An Arcade day starts at each player's local midnight, as in Wordle. The server has no
	timezone for the player, so it trusts the client's date, but only within one day of the
	server's UTC date: every timezone on Earth is inside that range. Throws a
	ValidationError for anything else. The client side is `arcade/util/today.ts`.
	"""
	parsed = None
	if isinstance(value, str) and ISO_DATE.match(value):
		try:
			parsed = date.fromisoformat(value)
		except ValueError:
			pass
	if parsed is None or abs((parsed - utc_today()).days) > 1:
		frappe.throw(_("{0} is not today's date").format(value), frappe.ValidationError)
	return parsed


def utc_today() -> date:
	return datetime.now(timezone.utc).date()
