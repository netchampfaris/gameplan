# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

import os
import re

import frappe
from frappe.tests.utils import FrappeTestCase

from gameplan.search_sqlite import GameplanSearch


class TestGameplanSearch(GameplanSearch):
	"""Test implementation of GameplanSearch for testing purposes."""

	def define_searchable_doctypes(self):
		return {
			"GP Task": {
				"fields": ["name", "title", "description", "modified", "project", "team", "owner"],
				"content_field": "description",
				"title_field": "title",
				"modified_field": "modified",
			},
			"GP Project": {
				"fields": ["name", "title", "description", "modified", "team", "owner"],
				"content_field": "description",
				"title_field": "title",
				"modified_field": "modified",
			},
		}


class TestSearch(FrappeTestCase):
	def setUp(self):
		self.search = TestGameplanSearch()
		self.project = frappe.get_doc(
			{
				"doctype": "GP Project",
				"title": "Public Project",
				"is_private": 0,
				"owner": "Administrator",
				"description": "This is a test project for searching.",
			}
		).insert(ignore_permissions=True)
		self.project2 = frappe.get_doc(
			{
				"doctype": "GP Project",
				"title": "Private Project",
				"is_private": 1,
				"owner": "Administrator",
				"description": "This is another test project.",
			}
		).insert(ignore_permissions=True)

		self.task1 = frappe.get_doc(
			{
				"doctype": "GP Task",
				"title": "Test Task 1",
				"project": self.project.name,
				"description": "This is a test task for searching.",
			}
		).insert(ignore_permissions=True)
		self.task2 = frappe.get_doc(
			{
				"doctype": "GP Task",
				"title": "Test Task 2",
				"project": self.project.name,
				"description": "Another test task, with different content.",
			}
		).insert(ignore_permissions=True)
		self.task3 = frappe.get_doc(
			{
				"doctype": "GP Task",
				"title": "Test Task 3",
				"project": self.project2.name,
				"description": "This task belongs to the second project.",
			}
		).insert(ignore_permissions=True)

		self.user1 = frappe.get_doc("User", "test@example.com")
		self.user2 = frappe.get_doc("User", "test1@example.com")

		self.search.build_index()

	def tearDown(self):
		self.project.delete(ignore_permissions=True)
		self.project2.delete(ignore_permissions=True)
		self.task1.delete(ignore_permissions=True)
		self.task2.delete(ignore_permissions=True)
		self.task3.delete(ignore_permissions=True)
		if (
			hasattr(self, "search")
			and self.search
			and hasattr(self.search, "db_path")
			and os.path.exists(self.search.db_path)
		):
			os.remove(self.search.db_path)
		frappe.db.commit()

	def test_search_basic(self):
		results = self.search.search("searching")
		self.assertEqual(len(results["results"]), 2)
		titles = [r["title"] for r in results["results"]]
		self.assertIn("Public Project", titles)
		self.assertIn("Test Task 1", titles)

	def test_title_search(self):
		results = self.search.search("Task 1")
		self.assertEqual(len(results["results"]), 1)
		self.assertEqual(results["results"][0]["name"], self.task1.name)
		self.assertIn("Test <mark>Task</mark> <mark>1</mark>", results["results"][0]["title"])

	def test_content_search(self):
		results = self.search.search("different content")
		self.assertEqual(len(results["results"]), 1)
		self.assertEqual(results["results"][0]["name"], self.task2.name)
		self.assertIn("with <mark>different</mark> <mark>content</mark>", results["results"][0]["content"])

	def test_doctype_scoring_boost(self):
		# Task has higher boost than project
		results = self.search.search("test")
		self.assertGreaterEqual(len(results["results"]), 3)
		# check that task is first
		self.assertEqual(results["results"][0]["doctype"], "GP Task")

	def test_permission_filter(self):
		# Admin can see all projects and tasks
		frappe.set_user("Administrator")
		results_admin = self.search.search("test")
		self.assertEqual(len(results_admin["results"]), 5)  # 2 projects, 3 tasks

		# Test user can only see public projects and their tasks
		frappe.set_user(self.user1.name)
		results_user = self.search.search("test")

		# Helper function to strip HTML markup from titles
		def strip_markup(text):
			return re.sub(r"<[^>]+>", "", text)

		titles = [strip_markup(r["title"]) for r in results_user["results"]]
		self.assertIn("Public Project", titles)
		self.assertIn("Test Task 1", titles)
		self.assertIn("Test Task 2", titles)
		self.assertNotIn("Private Project", titles)
		self.assertNotIn("Test Task 3", titles)

		# now add user to private project
		self.project2.reload()  # Reload to get latest timestamp
		self.project2.add_member(self.user1.name)
		frappe.db.commit()

		# Rebuild index to reflect membership changes
		self.search.build_index()

		results_user_new = self.search.search("test")
		titles = [strip_markup(r["title"]) for r in results_user_new["results"]]
		self.assertIn("Public Project", titles)
		self.assertIn("Test Task 1", titles)
		self.assertIn("Test Task 2", titles)
		self.assertIn("Private Project", titles)
		self.assertIn("Test Task 3", titles)

		self.project2.remove_member(self.user1.name)
		frappe.db.commit()
		frappe.set_user("Administrator")

	def test_highlighting(self):
		result = self.search.search("searching")["results"][0]
		self.assertIn("<mark>searching</mark>", result["content"])
