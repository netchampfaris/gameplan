# Copyright (c) 2026, Frappe Technologies Pvt Ltd and Contributors
# See license.txt

"""Arcade profiles: how each user's Avatar looks and how their Home is furnished.

Everyone in Gameplan may read every profile, since everyone in a Room sees everyone
else and anyone may visit anyone's Home. Only the profile's own user may create or
change it. The user or a System Manager may delete it. The realtime server asks
`get_player` who a socket belongs to, and it turns away Gameplan guests.
"""

import frappe

from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	MAX_HOME_ITEMS,
	get_home,
	get_home_directory,
	get_player,
)
from gameplan.tests.base import GameplanTestCase
from gameplan.tests.fixtures import create_member

LOOK = {"body": 2, "eyes": 3, "outfit": {"style": 5, "color": 1}, "hairstyle": {"style": 4, "color": 2}}
HOME = {
	"wallpaper": "cream",
	"floor": "golden-wood",
	"items": [{"prefab": "couch-gray", "x": 8, "y": 3}, {"prefab": "guestbook", "x": 9, "y": 8}],
}


def new_profile(user, appearance=None):
	return frappe.get_doc(
		{"doctype": "GP Arcade Profile", "user": user.name, "appearance": appearance or LOOK}
	).insert()


def save_home(user, home):
	profile = frappe.get_doc("GP Arcade Profile", user.name)
	profile.home = home
	return profile.save()


class TestArcadeProfile(GameplanTestCase):
	def test_members_manage_their_own_profile_and_read_everyone_elses(self):
		with self.as_user(self.member):
			profile = new_profile(self.member)
		self.assertEqual(profile.name, self.member.name)

		for reader in (self.second_member, self.admin, self.guest):
			self.assert_allowed(profile, "read", reader)
		self.assert_allowed(profile, "write", self.member)
		self.assert_allowed(profile, "delete", self.member)

		for other in (self.second_member, self.admin, self.guest):
			self.assert_not_allowed(profile, "write", other)
		for other in (self.second_member, self.admin, self.guest):
			self.assert_not_allowed(profile, "delete", other)

		with self.as_user(self.member):
			profile.appearance = {**LOOK, "accessory": {"style": 15, "color": 2}}
			profile.save()
		with self.as_user(self.second_member), self.assertRaises(frappe.PermissionError):
			frappe.get_doc("GP Arcade Profile", self.member.name).save()

	def test_nobody_creates_a_profile_for_someone_else(self):
		for creator in (self.second_member, self.admin, self.guest):
			with self.as_user(creator), self.assertRaises(frappe.PermissionError):
				new_profile(self.member)
		self.assertFalse(frappe.db.exists("GP Arcade Profile", self.member.name))

	def test_guests_cannot_create_even_their_own_profile(self):
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			new_profile(self.guest)

	def test_system_manager_may_delete_any_profile(self):
		with self.as_user(self.member):
			profile = new_profile(self.member)
		manager = create_member("manager@example.com", "Manager")
		manager.add_roles("System Manager")
		self.assert_allowed(profile, "delete", manager)

	def test_appearance_must_have_the_catalog_shape(self):
		broken = (
			{"body": 2},
			{**LOOK, "body": "2"},
			{**LOOK, "outfit": {"style": 5}},
			{**LOOK, "hat": {"style": 1, "color": 1}},
			{**LOOK, "eyes": 1000},
		)
		with self.as_user(self.member):
			for appearance in broken:
				with self.assertRaises(frappe.ValidationError, msg=appearance):
					new_profile(self.member, appearance)
			new_profile(self.member, {**LOOK, "accessory": None})

	def test_get_player_names_members_and_turns_away_guests(self):
		with self.as_user(self.member):
			self.assertEqual(get_player(), {"user": self.member.name, "full_name": "Member"})
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			get_player()

	def test_home_must_have_the_layout_shape_and_fit_the_room(self):
		couch = {"prefab": "couch-gray", "x": 8, "y": 3}
		broken = (
			{"wallpaper": "cream", "floor": "golden-wood"},
			{**HOME, "floor": "Golden Wood"},
			{**HOME, "items": {"couch": couch}},
			{**HOME, "items": [{**couch, "x": "8"}]},
			{**HOME, "items": [{**couch, "x": True}]},
			{**HOME, "items": [{**couch, "x": 14}]},
			{**HOME, "items": [{**couch, "y": -1}]},
			{**HOME, "items": [{**couch, "facing": "left"}]},
			{**HOME, "items": [{**couch, "prefab": "<script>"}]},
			{**HOME, "pet": "cat"},
		)
		with self.as_user(self.member):
			new_profile(self.member)
			for home in broken:
				with self.assertRaises(frappe.ValidationError, msg=home):
					save_home(self.member, home)
			with self.assertRaisesRegex(frappe.ValidationError, f"at most {MAX_HOME_ITEMS}"):
				save_home(self.member, {**HOME, "items": [couch] * (MAX_HOME_ITEMS + 1)})

			# Unknown catalog ids pass: the catalog lives in the client, which skips them.
			save_home(
				self.member, {**HOME, "items": [*HOME["items"], {"prefab": "hot-tub", "x": 0, "y": 12}]}
			)

	def test_only_the_owner_furnishes_a_home(self):
		with self.as_user(self.member):
			new_profile(self.member)
		with self.as_user(self.second_member), self.assertRaises(frappe.PermissionError):
			save_home(self.member, HOME)

	def test_anyone_in_the_arcade_may_visit_a_home(self):
		with self.as_user(self.second_member):
			self.assertEqual(
				get_home(self.member.name), {"user": self.member.name, "full_name": "Member", "home": None}
			)
		with self.as_user(self.member):
			new_profile(self.member)
			save_home(self.member, HOME)
		with self.as_user(self.second_member):
			self.assertEqual(get_home(self.member.name)["home"], HOME)
			# Guests are not in the Arcade, so they have no Home to visit.
			with self.assertRaises(frappe.DoesNotExistError):
				get_home(self.guest.name)
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			get_home(self.member.name)

	def test_home_directory_lists_members_with_their_look(self):
		with self.as_user(self.member):
			new_profile(self.member)
		with self.as_user(self.second_member):
			directory = {row["user"]: row for row in get_home_directory()}
		self.assertEqual(directory[self.member.name]["appearance"], LOOK)
		self.assertIsNone(directory[self.second_member.name]["appearance"])
		self.assertIn(self.admin.name, directory)
		self.assertNotIn(self.guest.name, directory)
		with self.as_user(self.guest), self.assertRaises(frappe.PermissionError):
			get_home_directory()
