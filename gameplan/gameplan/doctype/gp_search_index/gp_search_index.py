# Copyright (c) 2024, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GPSearchIndex(Document):
	pass


def on_doctype_update():
	index_name = "search_index"
	if not frappe.db.sql(f"SHOW INDEX FROM `tabGP Search Index` WHERE Key_name = '{index_name}'"):
		frappe.db.sql(f"ALTER TABLE `tabGP Search Index` ADD FULLTEXT {index_name}(title, content)")

def build_index():
	frappe.get_doc("GP Search Index", "GP Search Index").build_index()