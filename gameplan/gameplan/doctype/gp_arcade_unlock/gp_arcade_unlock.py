# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class GPArcadeUnlock(Document):
	"""One item in a player's Collection: a row of `GP Arcade Profile.unlocks`.

	Added only by `gp_arcade_profile.grant_item`.
	"""

	pass
