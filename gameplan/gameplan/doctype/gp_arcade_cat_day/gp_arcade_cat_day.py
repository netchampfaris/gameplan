# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A player's day with the team cat in the Common Room: whether they petted it, and the
name they gave it.

The cat itself has no server state; where it walks follows from the time
(`arcade/objects/Cat.ts`). The team keeps two things about it here:

- **Its name.** Anyone can name it, once per local day. The latest name given is its name,
  and the player who gave it "named" it. With no name given it is "the cat".
- **Its favourite person.** The player who petted it on the most days. Petting counts
  once per player per local day, so the count is days of care, not clicks. On a tie the
  player who reached that number first stays the favourite: the one whose last counted
  petting is older.

One document per player per day, named `<day> <user>`, so the database refuses a second.
The doctype is for System Managers; players go through `get_cat`, `pet_cat` and
`name_cat`.
"""

from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder import Order
from frappe.query_builder.functions import Count, Max

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import check_arcade_access

DOCTYPE = "GP Arcade Cat Day"
MAX_NAME_LENGTH = 24


class GPArcadeCatDay(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		cat_name: DF.Data | None
		day: DF.Date
		named_at: DF.Datetime | None
		petted_at: DF.Datetime | None
		user: DF.Link
	# end: auto-generated types

	def autoname(self):
		self.name = day_name(frappe.utils.getdate(self.day), self.user)

	def validate(self):
		# One line, single spaces: it is shown in a prompt and a card.
		self.cat_name = " ".join((self.cat_name or "").split()) or None
		if self.named_at and not self.cat_name:
			frappe.throw(_("Give the cat a name"), frappe.ValidationError)
		if self.cat_name and len(self.cat_name) > MAX_NAME_LENGTH:
			frappe.throw(_("Keep it to {0} characters").format(MAX_NAME_LENGTH), frappe.ValidationError)


def day_name(day: date, user: str) -> str:
	return f"{day.isoformat()} {user}"


def day_of(day: date, user: str) -> GPArcadeCatDay:
	"""The player's day with the cat, locked for the rest of the request. Made if missing."""
	name = day_name(day, user)
	if not frappe.db.exists(DOCTYPE, name):
		try:
			frappe.new_doc(DOCTYPE, user=user, day=day).insert(ignore_permissions=True)
		except frappe.DuplicateEntryError:
			# Another request of theirs made it first: the name is the lock.
			pass
	return frappe.get_doc(DOCTYPE, name, for_update=True)


def current_name() -> tuple[str, str] | None:
	"""The cat's name and who gave it, or None while nobody has named it."""
	latest = frappe.get_all(
		DOCTYPE,
		filters={"named_at": ["is", "set"]},
		fields=["cat_name", "user"],
		order_by="named_at desc",
		limit=1,
	)
	return (latest[0].cat_name, latest[0].user) if latest else None


def favourite_person() -> str | None:
	"""The player who petted the cat on the most days. On a tie, the one who got there
	first: their last counted petting is the older one. None until someone pets it."""
	day = frappe.qb.DocType(DOCTYPE)
	days = Count(day.name)
	last = Max(day.petted_at)
	rows = (
		frappe.qb.from_(day)
		.select(day.user)
		.where(day.petted_at.isnotnull())
		.groupby(day.user)
		.orderby(days, order=Order.desc)
		.orderby(last, order=Order.asc)
		.orderby(day.user, order=Order.asc)
		.limit(1)
		.run()
	)
	return rows[0][0] if rows else None


def cat_status(day: date) -> dict:
	"""The team cat as the session user sees it on `day`."""
	me = frappe.session.user
	named = current_name()
	favourite = favourite_person()
	users = [user for user in (named and named[1], favourite) if user] or [""]
	names = dict(
		frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name"], as_list=True)
	)

	def person(user: str | None) -> dict | None:
		return {"user": user, "full_name": names.get(user) or user} if user else None

	mine = frappe.db.get_value(DOCTYPE, day_name(day, me), ["petted_at", "named_at"], as_dict=True)
	return {
		"name": named[0] if named else None,
		"named_by": person(named[1] if named else None),
		"named_today": bool(mine and mine.named_at),
		"favourite": person(favourite),
		"petted_today": bool(mine and mine.petted_at),
	}


@frappe.whitelist()
def get_cat(today: str):
	"""The team cat on the player's local `today`: its name, who named it, its favourite
	person, and whether the player petted or named it today."""
	check_arcade_access()
	return cat_status(player_today(today))


@frappe.whitelist(methods=["POST"])
def pet_cat(today: str):
	"""Count the session user's petting for their local `today`. Petting again the same day
	is fine and changes nothing."""
	check_arcade_access()
	day = player_today(today)
	visit = day_of(day, frappe.session.user)
	if not visit.petted_at:
		visit.petted_at = frappe.utils.now_datetime()
		visit.save(ignore_permissions=True)
	return cat_status(day)


@frappe.whitelist(methods=["POST"])
def name_cat(today: str, cat_name: str):
	"""Give the team cat a new name, once per player per local `today`."""
	check_arcade_access()
	day = player_today(today)
	visit = day_of(day, frappe.session.user)
	if visit.named_at:
		frappe.throw(_("You already named the cat today. Try again tomorrow."), frappe.ValidationError)
	visit.cat_name = cat_name
	visit.named_at = frappe.utils.now_datetime()
	visit.save(ignore_permissions=True)
	return cat_status(day)
