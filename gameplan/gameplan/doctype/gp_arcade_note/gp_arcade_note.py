# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A short note someone leaves in the Arcade: on the Common Room's Notice Board, or in a
Home's Guestbook.

The author is the document's owner. Notes are never edited: to change one, delete it and
post again. Nothing here is realtime; the Arcade client tells the rest of the Room that a
board changed through its own socket (see `arcade/interactions/boards.ts`).
"""

import frappe
from frappe import _
from frappe.model.document import Document

from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import can_enter_arcade

MAX_MESSAGE_LENGTH = 280


class GPArcadeNote(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		board: DF.Literal["Notice Board", "Guestbook"]  # noqa: F722, F821
		home: DF.Link | None
		message: DF.SmallText
	# end: auto-generated types

	def validate(self):
		self.message = (self.message or "").strip()
		if not self.message:
			frappe.throw(_("Write something first"), frappe.ValidationError)
		if len(self.message) > MAX_MESSAGE_LENGTH:
			frappe.throw(
				_("A note can be at most {0} characters").format(MAX_MESSAGE_LENGTH), frappe.ValidationError
			)
		if self.board == "Guestbook" and not self.home:
			frappe.throw(_("A Guestbook note needs a Home"), frappe.ValidationError)
		if self.board == "Notice Board" and self.home:
			frappe.throw(_("A Notice Board note does not belong to a Home"), frappe.ValidationError)


def has_permission(doc, ptype="read", user=None, **kwargs):
	"""Anyone who can enter the Arcade reads and posts notes. Nobody edits one.

	Deleting is for the author, the owner of the Home whose Guestbook holds the note, and
	System Managers. Role permissions already keep Gameplan guests out; this hook repeats
	that through `can_enter_arcade` so the rule lives in one place with the Arcade's.
	"""
	user = user or frappe.session.user
	if not can_enter_arcade(user):
		return False
	if not hasattr(doc, "doctype"):
		return True
	if ptype == "delete":
		return user in (doc.owner, doc.home) or "System Manager" in frappe.get_roles(user)
	if ptype in ("write", "submit", "cancel", "amend"):
		return False
	return True
