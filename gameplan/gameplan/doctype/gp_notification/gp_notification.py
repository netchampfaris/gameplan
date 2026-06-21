# Copyright (c) 2022, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

import gameplan


class GPNotification(Document):
	def after_insert(self):
		gameplan.refetch_resource("Unread Notifications Count", user=self.to_user)

	@staticmethod
	def clear_notifications(discussion=None, comment=None, task=None, user=None):
		if not user:
			user = frappe.session.user
		filters = {"to_user": user}
		if discussion:
			filters["discussion"] = discussion
		if comment:
			filters["comment"] = comment
		if task:
			filters["task"] = task

		Notification = frappe.qb.DocType("GP Notification")
		query = frappe.qb.update(Notification).set(Notification.read, 1)
		for field, value in filters.items():
			query = query.where(Notification[field] == value)
		query.run()

		gameplan.refetch_resource("Unread Notifications Count", user=user)
