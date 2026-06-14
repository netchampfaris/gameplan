# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import frappe
from frappe.query_builder import DocType


def execute():
	"""Community-level pins now persist as `Category` instead of the legacy `Global`."""
	GPDiscussion = DocType("GP Discussion")
	frappe.qb.update(GPDiscussion).set(GPDiscussion.pin_scope, "Category").where(
		GPDiscussion.pin_scope == "Global"
	).run()
