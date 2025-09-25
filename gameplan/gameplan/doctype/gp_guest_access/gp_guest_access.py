# Copyright (c) 2022, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from gameplan.mixins.on_delete import delete_linked_records


class GPGuestAccess(Document):
	@staticmethod
	def create(user, project=None, team=None):
		guest_access = frappe.new_doc("GP Guest Access")

		if project and frappe.db.exists("GP Guest Access", {"user": user, "project": project}):
			return
		elif team and frappe.db.exists("GP Guest Access", {"user": user, "team": team}):
			return

		guest_access.user = user
		guest_access.project = project
		guest_access.team = team
		guest_access.insert(ignore_permissions=True)

		return guest_access

	@staticmethod
	def delete(user, project=None):
		name = frappe.db.get_value("GP Guest Access", {"project": project, "user": user})
		if name:
			frappe.delete_doc("GP Guest Access", name)


def on_user_delete(doc, method):
	delete_linked_records("User", doc.name, ["GP Guest Access"])
