# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import frappe
from frappe.query_builder import DocType
from frappe.query_builder.functions import Count


def execute():
	# find all duplicate guest access records
	# if `project` is set then check for duplicates based on `user` and `project`
	# if `team` is set then check for duplicates based on `user` and `team`
	# Get the DocType reference

	guest_access = DocType("GP Guest Access")

	# Find duplicates based on user and project (when project is set)
	project_duplicates = (
		frappe.qb.select(
			guest_access.name, guest_access.user, guest_access.project, Count(guest_access.name).as_("count")
		)
		.from_(guest_access)
		.where(guest_access.project.notnull())
		.groupby(guest_access.user, guest_access.project)
		.having(Count(guest_access.name) > 1)
		.run(as_dict=True)
	)

	# Find duplicates based on user and team (when team is set)
	team_duplicates = (
		frappe.qb.select(
			guest_access.name, guest_access.user, guest_access.team, Count(guest_access.name).as_("count")
		)
		.from_(guest_access)
		.where(guest_access.team.notnull())
		.groupby(guest_access.user, guest_access.team)
		.having(Count(guest_access.name) > 1)
		.run(as_dict=True)
	)

	# Delete duplicate records, keeping the first one for each group
	for duplicate_group in project_duplicates:
		duplicate_records = (
			frappe.qb.select(guest_access.name)
			.from_(guest_access)
			.where(
				(guest_access.user == duplicate_group.user)
				& (guest_access.project == duplicate_group.project)
			)
			.orderby(guest_access.creation)
			.run(as_list=True)
		)

		# Delete all except the first record
		for record in duplicate_records[1:]:
			frappe.delete_doc("GP Guest Access", record[0])

	for duplicate_group in team_duplicates:
		duplicate_records = (
			frappe.qb.select(guest_access.name)
			.from_(guest_access)
			.where((guest_access.user == duplicate_group.user) & (guest_access.team == duplicate_group.team))
			.orderby(guest_access.creation)
			.run(as_list=True)
		)

		# Delete all except the first record
		for record in duplicate_records[1:]:
			frappe.delete_doc("GP Guest Access", record[0])
