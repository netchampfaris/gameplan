import frappe


def execute():
	# Drafts created before the mode field existed are all standalone new-discussion
	# drafts. Backfill so the Drafts list (which filters mode='New') keeps showing them.
	frappe.db.sql(
		"""
		update `tabGP Draft`
		set mode = 'New'
		where coalesce(mode, '') = ''
		"""
	)
