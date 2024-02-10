# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import re
import frappe
import gameplan
from frappe.model.document import bulk_insert
from gameplan.utils.search import Search
from frappe.utils import strip_html_tags, update_progress_bar, cstr
from frappe.core.utils import html2text

UNSAFE_CHARS = re.compile(r"[\[\]{}<>+]")


class SearchIndex:
	def search(self, query, **kwargs):
		if query:
			accessible_projects = "|".join(self.get_accessible_projects())
			projects_query = f"@project:{{{accessible_projects}}}"
			query = f"{query} {projects_query}"
		return super().search(query, **kwargs)

	def clean_query(self, query):
		query = query.strip().replace("-*", "*")
		query = UNSAFE_CHARS.sub(" ", query)
		query = query.strip()
		return query



	def build(self):
		records = self.get_records()
		documents = []
		print(f"Indexing {len(records)} records")
		for i, doc in enumerate(records):
			doc.name = i + 1
			doc.last_updated = doc.last_updated or doc.modified
			doc.content = html2text(doc.content or "")
			documents.append(frappe.new_doc("GP Search Index", **doc))

		bulk_insert("GP Search Index", documents, ignore_duplicates=True, chunk_size=1000)
		# for i, doc in enumerate(records):
		# 	self.index_doc(doc)
		# 	if not hasattr(frappe.local, "request"):
		# 		update_progress_bar("Indexing", i, total)
		if not hasattr(frappe.local, "request"):
			print()

	def index_doc(self, doc):
		id, fields, payload = None, None, None
		if doc.doctype == "GP Discussion":
			id = f"GP Discussion:{doc.name}"
			fields = {
				"title": doc.title,
				"content": strip_html_tags(doc.content),
				"modified": doc.modified,
				"team": doc.team,
				"project": doc.project,
			}
			payload = {
				"team": doc.team,
				"project": doc.project,
			}
		elif doc.doctype == "GP Task":
			id = f"GP Task:{doc.name}"
			fields = {
				"title": doc.title,
				"content": strip_html_tags(doc.description),
				"modified": doc.modified,
				"team": doc.team,
				"project": doc.project,
			}
			payload = {
				"team": doc.team,
				"project": doc.project,
			}
		elif doc.doctype == "GP Page":
			id = f"GP Page:{doc.name}"
			fields = {
				"title": doc.title,
				"content": strip_html_tags(doc.content),
				"modified": doc.modified,
				"team": doc.team,
				"project": doc.project,
			}
			payload = {
				"team": doc.team,
				"project": doc.project,
			}
		elif doc.doctype == "GP Comment":
			id = f"GP Comment:{doc.name}"
			team = frappe.db.get_value(
				doc.reference_doctype, doc.reference_name, "team", cache=True
			)
			project = frappe.db.get_value(
				doc.reference_doctype, doc.reference_name, "project", cache=True
			)

			fields = {
				"content": strip_html_tags(doc.content),
				"modified": doc.modified,
				"team": team,
				"project": project,
			}
			payload = {
				"reference_doctype": doc.reference_doctype,
				"reference_name": doc.reference_name,
			}
		if id and fields and payload:
			self.add_document(id, fields, payload=payload)

	def remove_doc(self, doc):
		id = None
		if doc.doctype == "GP Discussion":
			id = f"GP Discussion:{doc.name}"
		elif doc.doctype == "GP Task":
			id = f"GP Task:{doc.name}"
		elif doc.doctype == "GP Page":
			id = f"GP Page:{doc.name}"
		elif doc.doctype == "GP Comment":
			id = f"GP Comment:{doc.name}"
		if id:
			self.remove_document(id)

	def get_records(self):
		records = []
		for d in frappe.db.get_all(
			"GP Discussion",
			fields=[
				"name as discussion",
				"title",
				"content",
				"last_post_at as last_updated",
				"modified",
				"project",
				"team",
			],
		):
			records.append(d)

		for d in frappe.db.get_all(
			"GP Task",
			fields=[
				"name as task",
				"title",
				"description as content",
				"modified",
				"project",
				"team",
			],
		):
			records.append(d)

		for d in frappe.db.get_all(
			"GP Page", fields=["name as page", "title", "content", "modified", "project", "team"]
		):
			records.append(d)

		for d in frappe.db.get_all(
			"GP Comment",
			fields=[
				"name as comment",
				"content",
				"modified",
				"reference_doctype",
				"reference_name",
			],
			filters={"deleted_at": ("is", "not set")},
		):
			reference_doctype = d.pop("reference_doctype")
			if reference_doctype == "GP Discussion":
				d.discussion = d.reference_name
				d.project = frappe.get_cached_value("GP Discussion", d.discussion, "project")
				d.team = frappe.get_cached_value("GP Discussion", d.discussion, "team")
			elif reference_doctype == "GP Task":
				d.task = d.reference_name
				d.project = frappe.get_cached_value("GP Task", d.task, "project")
				d.team = frappe.get_cached_value("GP Task", d.task, "team")
			records.append(d)

		return records

	def get_accessible_projects(self):
		from pypika.terms import ExistsCriterion

		if gameplan.is_guest():
			GuestAccess = frappe.qb.DocType("GP Guest Access")
			return (
				frappe.qb.from_(GuestAccess)
				.select(GuestAccess.project)
				.distinct()
				.where(GuestAccess.user == frappe.session.user)
				.run(pluck=True)
			)

		Project = frappe.qb.DocType("GP Project")
		Member = frappe.qb.DocType("GP Member")
		member_exists = (
			frappe.qb.from_(Member)
			.select(Member.name)
			.where(Member.parenttype == "GP Team")
			.where(Member.parent == Project.team)
			.where(Member.user == frappe.session.user)
		)
		projects = (
			frappe.qb.from_(Project)
			.select(Project.name)
			.distinct()
			.where(
				(Project.is_private == 0)
				| ((Project.is_private == 1) & ExistsCriterion(member_exists))
			)
			.run(pluck=True)
		)
		return [cstr(p) for p in projects]
