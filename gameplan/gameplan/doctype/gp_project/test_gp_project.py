# Copyright (c) 2022, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from gameplan.search_sqlite import GameplanSearch
from gameplan.tests.utils import create_member, create_project, create_team


class TestGPProject(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def test_archive_deletes_current_users_pin(self):
		frappe.set_user("Administrator")
		team = create_team("Pinned Archive Team")
		project = create_project("Pinned Archive Space", team.name)
		pin = frappe.get_doc(doctype="GP Pinned Project", project=project.name).insert(
			ignore_permissions=True
		)

		project.archive()

		self.assertTrue(project.archived_at)
		self.assertFalse(frappe.db.exists("GP Pinned Project", pin.name))

	def test_search_private_space_requires_space_membership(self):
		member = create_member("test_search_member@example.com")
		team = create_team("Search Permissions Team")
		team.add_member(member.name)
		team.save(ignore_permissions=True)

		public_project = create_project("Search Public Space", team.name)
		private_project = create_project("Search Private Space", team.name, is_private=1)

		frappe.set_user(member.name)
		accessible_projects = GameplanSearch()._get_accessible_projects()

		self.assertIn(str(public_project.name), accessible_projects)
		self.assertNotIn(str(private_project.name), accessible_projects)

		frappe.set_user("Administrator")
		private_project.add_member(member.name)

		frappe.set_user(member.name)
		accessible_projects = GameplanSearch()._get_accessible_projects()

		self.assertIn(str(private_project.name), accessible_projects)
