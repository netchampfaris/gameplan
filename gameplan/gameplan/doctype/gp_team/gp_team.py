# Copyright (c) 2022, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import append_number_if_name_exists
from pypika.terms import ExistsCriterion

import gameplan
from gameplan.mixins.archivable import Archivable
from gameplan.utils import validate_type


class GPTeam(Archivable, Document):
	on_delete_cascade = ["GP Project"]
	on_delete_set_null = ["GP Notification"]

	def as_dict(self, *args, **kwargs) -> dict:
		members = [m.user for m in self.members]
		if self.is_private and frappe.session.user not in members:
			frappe.throw("Not permitted", frappe.PermissionError)

		d = super().as_dict(*args, **kwargs)
		return d

	@staticmethod
	def get_list_query(query):
		Team = frappe.qb.DocType("GP Team")
		Member = frappe.qb.DocType("GP Member")
		member_exists = (
			frappe.qb.from_(Member)
			.select(Member.name)
			.where(Member.parenttype == "GP Team")
			.where(Member.parent == Team.name)
			.where(Member.user == frappe.session.user)
		)
		query = query.where(
			(Team.is_private == 0) | ((Team.is_private == 1) & ExistsCriterion(member_exists))
		)
		is_guest = gameplan.is_guest()
		if is_guest:
			Team = frappe.qb.DocType("GP Team")
			GuestAccess = frappe.qb.DocType("GP Guest Access")
			team_list = GuestAccess.select(GuestAccess.team).where(GuestAccess.user == frappe.session.user)
			query = query.where(Team.name.isin(team_list))
		return query

	def before_insert(self):
		if not self.name:
			slug = frappe.scrub(self.title).replace("_", "-")
			self.name = append_number_if_name_exists("GP Team", slug)

	def after_insert(self):
		self.create_general_space()

	def create_general_space(self):
		# The migration that creates `Default` suppresses this so orphaned spaces can be
		# reassigned into it without a stray General being created first.
		if self.flags.skip_general_space:
			return

		# Guarantee every community has at least one public landing space.
		# Skip if any space already exists in this team (covers the migration path
		# where Default may inherit pre-existing orphaned spaces).
		if frappe.db.exists("GP Project", {"team": self.name}):
			return

		frappe.get_doc(doctype="GP Project", title="General", team=self.name, is_private=0).insert(
			ignore_permissions=True
		)

	def add_member(self, email):
		if email not in [member.user for member in self.members]:
			self.append("members", {"email": email, "user": email, "status": "Accepted"})

	@frappe.whitelist()
	def add_members(self, users):
		for user in users:
			self.add_member(user)
		self.save()

	@frappe.whitelist()
	def remove_member(self, user):
		for member in self.members:
			if member.user == user:
				self.remove(member)
				self.save()
				break


@frappe.whitelist(methods=["POST"])
@validate_type
def update_joined_teams(teams: list = None):
	if gameplan.is_guest():
		frappe.throw("Guests cannot manage communities")

	team_names = set(teams or [])
	if not team_names:
		frappe.throw("Select at least one community")

	accessible_team_names = set(get_accessible_team_names())
	if invalid_teams := team_names - accessible_team_names:
		frappe.throw(f"Not permitted to join: {', '.join(sorted(invalid_teams))}")

	user = frappe.session.user
	for team_name in accessible_team_names:
		team = frappe.get_doc("GP Team", team_name)
		member = next((member for member in team.members if member.user == user), None)

		if team_name in team_names and not member:
			team.append("members", {"user": user})
			team.save(ignore_permissions=True)
		elif team_name not in team_names and member:
			team.remove(member)
			team.save(ignore_permissions=True)

	return list(team_names)


def get_accessible_team_names():
	Team = frappe.qb.DocType("GP Team")
	Member = frappe.qb.DocType("GP Member")
	member_exists = (
		frappe.qb.from_(Member)
		.select(Member.name)
		.where(Member.parenttype == "GP Team")
		.where(Member.parent == Team.name)
		.where(Member.user == frappe.session.user)
	)
	query = (
		frappe.qb.from_(Team)
		.select(Team.name)
		.where(Team.archived_at.isnull())
		.where((Team.is_private == 0) | ((Team.is_private == 1) & ExistsCriterion(member_exists)))
	)

	return [team.name for team in query.run(as_dict=True)]
