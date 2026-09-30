# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class GPArcadeDartsWinner(Document):
	"""One winner of a week of darts: a row of `GP Arcade Darts Week.winners`.

	Added only by `gp_arcade_darts_week.settle_week`. Counting a user's rows gives how many
	weeks they won.
	"""

	pass
