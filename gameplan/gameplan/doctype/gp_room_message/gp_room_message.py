# Copyright (c) 2024, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GPRoomMessage(Document):
	def after_insert(self):
		room = frappe.get_doc("GP Room", self.room)
		room.last_message = self.name
		room.save(ignore_permissions=True)
