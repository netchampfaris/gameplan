# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Arcade notes: the Common Room's Notice Board and each Home's Guestbook.

Anyone who can enter the Arcade reads and posts notes; Gameplan guests cannot. Nobody
edits a note. The author, the owner of the Home a Guestbook note is in, and System
Managers may delete it.
"""

import frappe

from gameplan.tests.base import GameplanTestCase
from gameplan.tests.fixtures import create_member


def pin(message="Hello from the Common Room"):
	return frappe.get_doc({"doctype": "GP Arcade Note", "board": "Notice Board", "message": message}).insert()


def sign(home, message="Lovely place!"):
	return frappe.get_doc(
		{"doctype": "GP Arcade Note", "board": "Guestbook", "home": home, "message": message}
	).insert()


class TestArcadeNote(GameplanTestCase):
	def test_members_read_and_post_notes_and_guests_do_neither(self):
		with self.as_user(self.member):
			note = pin()
		self.assertEqual(note.owner, self.member.name)

		for reader in (self.member, self.second_member, self.admin, self.outsider):
			self.assert_allowed(note, "read", reader)
		self.assert_not_allowed(note, "read", self.guest)

		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			pin()
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			sign(self.member.name)
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			frappe.get_list("GP Arcade Note")
		with self.as_user(self.second_member):
			names = [row.name for row in frappe.get_list("GP Arcade Note")]
		self.assertIn(note.name, names)

	def test_nobody_edits_a_note_after_posting(self):
		with self.as_user(self.member):
			note = pin()
		manager = create_member("manager@example.com", "Manager")
		manager.add_roles("System Manager")
		for user in (self.member, self.second_member, self.admin, manager):
			self.assert_not_allowed(note, "write", user)
		with self.as_user(self.member), self.assertRaises(frappe.PermissionError):
			note.message = "Changed my mind"
			note.save()

	def test_the_author_deletes_their_own_notice_board_note(self):
		with self.as_user(self.member):
			note = pin()
		self.assert_allowed(note, "delete", self.member)
		for other in (self.second_member, self.admin, self.guest):
			self.assert_not_allowed(note, "delete", other)
		with self.as_user(self.second_member), self.assertRaises(frappe.PermissionError):
			frappe.delete_doc("GP Arcade Note", note.name)
		with self.as_user(self.member):
			frappe.delete_doc("GP Arcade Note", note.name)
		self.assertFalse(frappe.db.exists("GP Arcade Note", note.name))

	def test_the_home_owner_and_the_author_delete_guestbook_notes(self):
		with self.as_user(self.second_member):
			note = sign(self.member.name)
		self.assert_allowed(note, "delete", self.member)
		self.assert_allowed(note, "delete", self.second_member)
		for other in (self.admin, self.outsider, self.guest):
			self.assert_not_allowed(note, "delete", other)

	def test_system_manager_deletes_any_note(self):
		with self.as_user(self.member):
			pinned = pin()
			signed = sign(self.second_member.name)
		manager = create_member("manager@example.com", "Manager")
		manager.add_roles("System Manager")
		self.assert_allowed(pinned, "delete", manager)
		self.assert_allowed(signed, "delete", manager)

	def test_messages_are_short_and_boards_are_consistent(self):
		with self.as_user(self.member):
			self.assertEqual(pin("  Tea at four  ").message, "Tea at four")
			self.assertEqual(len(pin("é" * 280).message), 280)
			for message in ("", "   ", "x" * 281):
				with self.assertRaises(frappe.ValidationError, msg=repr(message)):
					pin(message)
			with self.assertRaises(frappe.ValidationError):
				frappe.get_doc({"doctype": "GP Arcade Note", "board": "Guestbook", "message": "Hi"}).insert()
			with self.assertRaises(frappe.ValidationError):
				frappe.get_doc(
					{
						"doctype": "GP Arcade Note",
						"board": "Notice Board",
						"home": self.second_member.name,
						"message": "Hi",
					}
				).insert()
