# Copyright (c) 2025, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import re

import frappe
from frappe.model.document import Document


class GPDraft(Document):
	def before_save(self):
		from gameplan.utils.sanitizer import sanitize_content

		self.content = sanitize_content(self.content)

	@staticmethod
	def get_list(query):
		GPDraft = frappe.qb.DocType("GP Draft")
		query = query.where(GPDraft.owner == frappe.session.user)
		return query

	@frappe.whitelist()
	def publish(self):
		if self.owner != frappe.session.user:
			frappe.throw("You are not allowed to publish this draft")

		if self.type == "Discussion":
			content = remove_query_params_from_images(self.content)
			# New editor uploads are unattached and get picked up by HasAttachments on
			# insert. Older drafts can still have files attached to the draft itself;
			# move those before deleting the draft so Frappe doesn't cascade-delete them.
			discussion = frappe.new_doc(
				"GP Discussion", title=self.title, content=content, project=self.project
			).insert()
			self.move_attachments_to(discussion)

			self.delete()
			return discussion.name

	def commit(self, reference_doctype: str, reference_name: str):
		"""Finalize an edit/comment draft whose content has already been saved onto its
		target document. Reparents any draft-owned attachments onto the target (so they
		survive the draft deletion) and clears the ?fid= query params that otherwise hide
		the migrated images, then deletes the draft."""
		if self.owner != frappe.session.user:
			frappe.throw("You are not allowed to modify this draft")

		target = frappe.get_doc(reference_doctype, reference_name)
		self.move_attachments_to(target)

		cleaned = remove_query_params_from_images(target.content or "")
		if cleaned != target.content:
			target.content = cleaned
			target.save()

		self.delete()

	def move_attachments_to(self, doc):
		attachments = frappe.qb.get_query(
			"File",
			filters={"attached_to_doctype": self.doctype, "attached_to_name": self.name},
		).run(pluck="name")
		for attachment in attachments:
			frappe.db.set_value(
				"File",
				attachment,
				{"attached_to_doctype": doc.doctype, "attached_to_name": doc.name},
				update_modified=False,
			)


@frappe.whitelist()
def find_my_draft(
	type: str,
	mode: str = "New",
	reference_doctype: str | None = None,
	reference_name: str | None = None,
):
	"""Return the current user's singleton draft for a given target, or None.

	Singleton drafts (a comment-in-progress on a discussion, an in-flight edit of a
	post/comment) are keyed by (owner, type, mode, reference) so the same logical edit
	resolves to one row across tabs and devices. New-discussion drafts are standalone
	and looked up by name instead, so they are not served here."""
	filters = {"owner": frappe.session.user, "type": type, "mode": mode}
	if reference_name:
		filters["reference_doctype"] = reference_doctype
		filters["reference_name"] = reference_name

	name = frappe.db.get_value("GP Draft", filters, "name")
	if not name:
		return None
	return frappe.get_doc("GP Draft", name).as_dict()


@frappe.whitelist()
def publish_draft(name: str):
	"""Publish a discussion draft by name. Returns the new GP Discussion name."""
	return frappe.get_doc("GP Draft", name).publish()


@frappe.whitelist()
def commit_draft(name: str, reference_doctype: str, reference_name: str):
	"""Finalize an edit/comment draft after its content has been saved onto the target.
	See GPDraft.commit for the attachment-migration rationale."""
	draft = frappe.get_doc("GP Draft", name)
	draft.commit(reference_doctype, reference_name)


def remove_query_params_from_images(content):
	# replace strings like src="/path/to/image.jpg?fid=param" with src="/path/to/image.jpg"
	# because when we publish draft, images linked to the draft are deleted
	# presence of fid=<name> in the image url prevents the image from being displayed
	pattern = r'(src="[^"]+)\?[^"]*(")'
	return re.sub(pattern, r"\1\2", content)
