# Copyright (c) 2025, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Tests for the Phase 08 community-scope migration patches."""

import frappe
from frappe.tests.utils import FrappeTestCase

from gameplan.gameplan.doctype.gp_discussion.api import get_discussions
from gameplan.gameplan.doctype.gp_project.patches.assign_default_team_to_uncategorized_spaces import (
	execute as assign_default_team,
)
from gameplan.tests.utils import create_member, create_project, create_team


def _make_orphan_project(title):
	"""Insert a GP Project with no team, bypassing fetch_from / hooks."""
	project = frappe.new_doc("GP Project")
	project.title = title
	project.insert(ignore_permissions=True)
	# Force team empty at the db level in case anything backfilled it.
	frappe.db.set_value("GP Project", project.name, "team", None, update_modified=False)
	return project.name


class TestAssignDefaultTeamMigration(FrappeTestCase):
	def setUp(self):
		create_member("test_migration_member@example.com")
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def test_orphaned_spaces_assigned_to_default(self):
		orphan = _make_orphan_project("Orphan Space")
		self.assertFalse(frappe.db.get_value("GP Project", orphan, "team"))

		assign_default_team()

		default_team = frappe.db.exists("GP Team", {"title": "Default"})
		self.assertTrue(default_team)
		self.assertEqual(frappe.db.get_value("GP Project", orphan, "team"), default_team)

	def test_no_default_created_on_fully_categorized_site(self):
		# Ensure a clean fully-categorized state inside this rolled-back transaction:
		# remove any leftover Default and assign every space to a real community.
		_categorize_everything()
		self.assertFalse(_uncategorized_exists())

		assign_default_team()

		# A fully-categorized site must not get a Default community.
		self.assertFalse(frappe.db.exists("GP Team", {"title": "Default"}))

	def test_default_does_not_get_duplicate_general(self):
		_make_orphan_project("Orphan For General Check")

		assign_default_team()

		default_team = frappe.db.exists("GP Team", {"title": "Default"})
		self.assertTrue(default_team)
		# Default holds only the reassigned orphan(s) — no auto-created General.
		general = frappe.db.get_all(
			"GP Project", filters={"team": default_team, "title": "General"}, pluck="name"
		)
		self.assertEqual(general, [])

	def test_idempotent_on_rerun(self):
		_make_orphan_project("Orphan Idempotent")

		assign_default_team()
		default_team = frappe.db.exists("GP Team", {"title": "Default"})
		first_count = frappe.db.count("GP Project", {"team": default_team})

		# Second run must not create another Default or reshuffle anything.
		assign_default_team()
		self.assertEqual(frappe.db.count("GP Team", {"title": "Default"}), 1)
		self.assertEqual(frappe.db.count("GP Project", {"team": default_team}), first_count)

	def test_null_team_discussion_visible_after_backfill(self):
		team = create_team("Backfill Team")
		project = create_project("Backfill Space", team.name)

		discussion = frappe.get_doc(
			doctype="GP Discussion",
			title="Null team discussion",
			project=project.name,
			content="hi",
		).insert(ignore_permissions=True)
		# Simulate a legacy row created before fetch_from existed.
		frappe.db.set_value("GP Discussion", discussion.name, "team", None, update_modified=False)

		before = get_discussions(filters={"team": team.name, "project": project.name}, limit=50)
		self.assertNotIn(discussion.name, [d.name for d in before])

		assign_default_team()

		self.assertEqual(frappe.db.get_value("GP Discussion", discussion.name, "team"), team.name)
		after = get_discussions(filters={"team": team.name, "project": project.name}, limit=50)
		self.assertIn(discussion.name, [d.name for d in after])


class TestFetchFromTeam(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def test_fetch_from_populates_team_on_new_discussion(self):
		team = create_team("Fetch From Team")
		project = create_project("Fetch From Space", team.name)

		discussion = frappe.get_doc(
			doctype="GP Discussion",
			title="Auto team discussion",
			project=project.name,
			content="hi",
		).insert(ignore_permissions=True)

		# fetch_from: project.team auto-populates team on insert.
		self.assertEqual(discussion.team, team.name)


def _uncategorized_exists():
	return bool(frappe.db.get_all("GP Project", filters={"team": ["in", ["", None]]}, limit=1))


def _categorize_everything():
	"""Force a fully-categorized state for the no-Default test (rolled back afterwards)."""
	frappe.db.delete("GP Team", {"title": "Default"})
	team = create_team("Catch All Team")
	frappe.db.sql(
		"UPDATE `tabGP Project` SET team = %s WHERE team IS NULL OR team = ''",
		team.name,
	)
