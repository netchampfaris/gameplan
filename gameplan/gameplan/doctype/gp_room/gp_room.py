# Copyright (c) 2024, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class GPRoom(Document):
	def validate(self):
		self.users_count = len(self.users)
