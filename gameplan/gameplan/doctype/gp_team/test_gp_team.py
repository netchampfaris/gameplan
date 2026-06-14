# Copyright (c) 2022, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestGPTeam(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def test_after_insert_creates_general_space(self):
		team = frappe.get_doc(doctype="GP Team", title="General Space Team").insert(ignore_permissions=True)

		spaces = frappe.db.get_all("GP Project", filters={"team": team.name}, fields=["title", "is_private"])
		self.assertEqual(len(spaces), 1)
		self.assertEqual(spaces[0].title, "General")
		# General must be public so all community members can see it by default.
		self.assertEqual(spaces[0].is_private, 0)

	def test_after_insert_skips_general_when_space_already_exists(self):
		team = frappe.get_doc(doctype="GP Team", title="Existing Space Team").insert(ignore_permissions=True)
		# Hook already created exactly one General space.
		self.assertEqual(frappe.db.count("GP Project", {"team": team.name}), 1)

		# Re-running the hook must not duplicate it (idempotency rule).
		team.create_general_space()
		self.assertEqual(frappe.db.count("GP Project", {"team": team.name}), 1)

	def test_skip_general_space_flag_suppresses_hook(self):
		team = frappe.new_doc("GP Team")
		team.title = "Suppressed Space Team"
		team.flags.skip_general_space = True
		team.insert(ignore_permissions=True)

		self.assertEqual(frappe.db.count("GP Project", {"team": team.name}), 0)
