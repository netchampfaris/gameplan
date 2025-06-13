# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import frappe


class GPTaskTools:
	"""Task management tools for Juno AI"""

	@staticmethod
	def get_user_tasks(
		status: Optional[str] = None,
		priority: Optional[str] = None,
		project: Optional[str] = None,
		assigned_to: Optional[str] = None,
		due_date_filter: Optional[str] = None,
		limit: int = 20,
	) -> Dict[str, Any]:
		"""
		Get tasks for the current user or specified user

		Args:
			status: Filter by status (Backlog, Todo, In Progress, Done, Canceled)
			priority: Filter by priority (Urgent, High, Medium, Low)
			project: Filter by project name
			assigned_to: Filter by assigned user (defaults to current user if not specified)
			due_date_filter: Filter by due date (today, tomorrow, this_week, overdue)
			limit: Maximum number of tasks to return
		"""
		try:
			current_user = frappe.session.user

			# Build filters
			filters = {}

			# If no assigned_to specified, show current user's tasks
			if not assigned_to:
				assigned_to = current_user

			if assigned_to:
				filters["assigned_to"] = assigned_to

			if status:
				filters["status"] = status

			if priority:
				filters["priority"] = priority

			if project:
				# Handle both project name and project ID
				if not project.startswith("PRJ-"):
					# Try to find project by title
					project_doc = frappe.db.get_value("GP Project", {"title": project}, "name")
					if project_doc:
						project = project_doc
				filters["project"] = project

			# Handle due date filters
			if due_date_filter:
				today = datetime.now().date()

				if due_date_filter.lower() == "today":
					filters["due_date"] = today
				elif due_date_filter.lower() == "tomorrow":
					tomorrow = today + timedelta(days=1)
					filters["due_date"] = tomorrow
				elif due_date_filter.lower() == "this_week":
					week_end = today + timedelta(days=7)
					filters["due_date"] = ["between", [today, week_end]]
				elif due_date_filter.lower() == "overdue":
					filters["due_date"] = ["<", today]
					filters["status"] = ["!=", "Done"]

			# Get tasks
			tasks = frappe.get_all(
				"GP Task",
				filters=filters,
				fields=[
					"name",
					"title",
					"description",
					"status",
					"priority",
					"due_date",
					"start_date",
					"assigned_to",
					"project",
					"is_completed",
					"completed_at",
					"comments_count",
					"creation",
					"modified",
				],
				order_by="due_date asc, priority desc, modified desc",
				limit=limit,
			)

			# Enrich task data
			for task in tasks:
				if task.get("project"):
					project_title = frappe.db.get_value("GP Project", task["project"], "title")
					task["project_title"] = project_title

				if task.get("assigned_to"):
					user_name = frappe.db.get_value("User", task["assigned_to"], "full_name")
					task["assigned_to_name"] = user_name or task["assigned_to"]

			return {"success": True, "tasks": tasks, "count": len(tasks), "filters_applied": filters}

		except Exception as e:
			frappe.log_error(f"Failed to get user tasks: {str(e)}", "Juno Task Tools")
			return {"success": False, "error": str(e), "tasks": []}

	@staticmethod
	def create_task(
		title: str,
		description: Optional[str] = None,
		status: Optional[str] = None,
		priority: Optional[str] = None,
		due_date: Optional[str] = None,
		start_date: Optional[str] = None,
		project: Optional[str] = None,
		assigned_to: Optional[str] = None,
	) -> Dict[str, Any]:
		"""
		Create a new task

		Args:
			title: Task title (required)
			description: Task description
			status: Task status (Backlog, Todo, In Progress, Done, Canceled)
			priority: Task priority (Urgent, High, Medium, Low)
			due_date: Due date in YYYY-MM-DD format or natural language
			start_date: Start date in YYYY-MM-DD format
			project: Project name or ID
			assigned_to: User email to assign the task to
		"""
		try:
			# Validate required fields
			if not title:
				return {"success": False, "error": "Task title is required"}

			# Create task document
			task_doc = frappe.new_doc("GP Task")
			task_doc.title = title

			if description:
				task_doc.description = description

			# Set status with default
			task_doc.status = status if status else "Backlog"

			if priority:
				task_doc.priority = priority

			# Handle dates
			if due_date:
				parsed_due_date = GPTaskTools._parse_date(due_date)
				if parsed_due_date:
					task_doc.due_date = parsed_due_date

			if start_date:
				parsed_start_date = GPTaskTools._parse_date(start_date)
				if parsed_start_date:
					task_doc.start_date = parsed_start_date

			# Handle project
			if project:
				project_name = GPTaskTools._get_project_name(project)
				if project_name:
					task_doc.project = project_name

			# Handle assignment with improved logic
			if assigned_to:
				# Check if user exists
				if frappe.db.exists("User", assigned_to):
					task_doc.assigned_to = assigned_to
				else:
					# Try to find user by full name or email pattern
					user_found = None

					# Get all enabled users
					users = frappe.get_all(
						"User", filters={"enabled": 1}, fields=["name", "email", "full_name"]
					)

					# Look for exact match first
					for user in users:
						if user.email.lower() == assigned_to.lower():
							user_found = user.email
							break

					# If not found, try partial matches on name or email
					if not user_found:
						search_term = assigned_to.lower()
						for user in users:
							if search_term in user.email.lower() or (
								user.full_name and search_term in user.full_name.lower()
							):
								user_found = user.email
								break

					if user_found:
						task_doc.assigned_to = user_found
					else:
						# Get available users for suggestion
						available_users = [f"{u.full_name} ({u.email})" for u in users[:5]]
						return {
							"success": False,
							"error": f"User '{assigned_to}' not found. Available users include: {', '.join(available_users)}. You can also omit the assigned_to field to assign to the current user.",
						}
			else:
				# Assign to current user by default
				current_user_email = frappe.session.user
				if current_user_email == "Administrator":
					# Map Administrator to admin@example.com for consistency
					current_user_email = "admin@example.com"
				task_doc.assigned_to = current_user_email

			# Save the task
			task_doc.insert()

			# Commit the transaction to ensure changes are persisted
			frappe.db.commit()

			return {
				"success": True,
				"task": {
					"name": task_doc.name,
					"title": task_doc.title,
					"status": task_doc.status,
					"priority": task_doc.priority,
					"due_date": task_doc.due_date,
					"assigned_to": task_doc.assigned_to,
					"project": task_doc.project,
				},
				"message": f"Task '{title}' created successfully",
			}

		except Exception as e:
			frappe.log_error(f"Failed to create task: {str(e)}", "Juno Task Tools")
			return {"success": False, "error": str(e)}

	@staticmethod
	def update_task(
		task_identifier: str,
		title: Optional[str] = None,
		description: Optional[str] = None,
		status: Optional[str] = None,
		priority: Optional[str] = None,
		due_date: Optional[str] = None,
		start_date: Optional[str] = None,
		project: Optional[str] = None,
		assigned_to: Optional[str] = None,
	) -> Dict[str, Any]:
		"""
		Update an existing task

		Args:
			task_identifier: Task ID or title to identify the task
			title: New task title
			description: New task description
			status: New task status
			priority: New task priority
			due_date: New due date
			start_date: New start date
			project: New project
			assigned_to: New assignee
		"""
		try:
			# Find the task
			task_doc = GPTaskTools._find_task(task_identifier)
			if not task_doc:
				return {"success": False, "error": f"Task '{task_identifier}' not found"}

			# Track changes
			changes = []

			# Update fields
			if title:
				task_doc.title = title
				changes.append(f"title to '{title}'")

			if description is not None:  # Allow empty description
				task_doc.description = description
				changes.append("description")

			if status:
				if status in ["Backlog", "Todo", "In Progress", "Done", "Canceled"]:
					task_doc.status = status
					changes.append(f"status to '{status}'")

					# Auto-complete task if status is Done
					if status == "Done" and not task_doc.is_completed:
						task_doc.is_completed = 1
						task_doc.completed_at = frappe.utils.now()
						task_doc.completed_by = frappe.session.user
				else:
					return {"success": False, "error": f"Invalid status '{status}'"}

			if priority:
				if priority in ["Urgent", "High", "Medium", "Low"]:
					task_doc.priority = priority
					changes.append(f"priority to '{priority}'")
				else:
					return {"success": False, "error": f"Invalid priority '{priority}'"}

			if due_date:
				parsed_due_date = GPTaskTools._parse_date(due_date)
				if parsed_due_date:
					task_doc.due_date = parsed_due_date
					changes.append(f"due date to '{parsed_due_date}'")

			if start_date:
				parsed_start_date = GPTaskTools._parse_date(start_date)
				if parsed_start_date:
					task_doc.start_date = parsed_start_date
					changes.append(f"start date to '{parsed_start_date}'")

			if project:
				project_name = GPTaskTools._get_project_name(project)
				if project_name:
					task_doc.project = project_name
					changes.append(f"project to '{project}'")

			if assigned_to:
				if frappe.db.exists("User", assigned_to):
					task_doc.assigned_to = assigned_to
					changes.append(f"assigned to '{assigned_to}'")
				else:
					return {"success": False, "error": f"User '{assigned_to}' not found"}

			if not changes:
				return {"success": False, "error": "No changes specified"}

			# Save the task
			task_doc.save()

			# Commit the transaction to ensure changes are persisted
			frappe.db.commit()

			# Get enriched task data for better display
			enriched_task = {
				"name": task_doc.name,
				"title": task_doc.title,
				"description": task_doc.description,
				"status": task_doc.status,
				"priority": task_doc.priority,
				"due_date": str(task_doc.due_date) if task_doc.due_date else None,
				"start_date": str(task_doc.start_date) if task_doc.start_date else None,
				"assigned_to": task_doc.assigned_to,
				"project": task_doc.project,
				"is_completed": task_doc.is_completed,
				"completed_at": task_doc.completed_at,
				"comments_count": task_doc.comments_count,
				"creation": task_doc.creation,
				"modified": task_doc.modified,
			}

			# Add enriched data
			if task_doc.project:
				project_title = frappe.db.get_value("GP Project", task_doc.project, "title")
				enriched_task["project_title"] = project_title

			if task_doc.assigned_to:
				user_name = frappe.db.get_value("User", task_doc.assigned_to, "full_name")
				enriched_task["assigned_to_name"] = user_name or task_doc.assigned_to

			return {
				"success": True,
				"task": enriched_task,
				"changes": changes,
				"message": f"Task '{task_doc.title}' updated successfully",
			}

		except Exception as e:
			frappe.log_error(f"Failed to update task: {str(e)}", "Juno Task Tools")
			return {"success": False, "error": str(e)}

	@staticmethod
	def search_tasks(query: str, limit: int = 10) -> Dict[str, Any]:
		"""
		Search tasks by title or description

		Args:
			query: Search query string
			limit: Maximum number of results to return
		"""
		try:
			# Search in title and description
			tasks = frappe.get_all(
				"GP Task",
				or_filters=[{"title": ["like", f"%{query}%"]}, {"description": ["like", f"%{query}%"]}],
				fields=[
					"name",
					"title",
					"description",
					"status",
					"priority",
					"due_date",
					"assigned_to",
					"project",
					"is_completed",
				],
				order_by="modified desc",
				limit=limit,
			)

			# Enrich task data
			for task in tasks:
				if task.get("project"):
					project_title = frappe.db.get_value("GP Project", task["project"], "title")
					task["project_title"] = project_title

				if task.get("assigned_to"):
					user_name = frappe.db.get_value("User", task["assigned_to"], "full_name")
					task["assigned_to_name"] = user_name or task["assigned_to"]

			return {"success": True, "tasks": tasks, "count": len(tasks), "query": query}

		except Exception as e:
			frappe.log_error(f"Failed to search tasks: {str(e)}", "Juno Task Tools")
			return {"success": False, "error": str(e), "tasks": []}

	@staticmethod
	def get_task_summary() -> Dict[str, Any]:
		"""Get a summary of current user's tasks"""
		try:
			current_user = frappe.session.user

			# Get task counts by status
			status_counts = {}
			for status in ["Backlog", "Todo", "In Progress", "Done", "Canceled"]:
				count = frappe.db.count("GP Task", {"assigned_to": current_user, "status": status})
				status_counts[status.lower().replace(" ", "_")] = count

			# Get overdue tasks count
			today = datetime.now().date()
			overdue_count = frappe.db.count(
				"GP Task", {"assigned_to": current_user, "due_date": ["<", today], "status": ["!=", "Done"]}
			)

			# Get due today count
			due_today_count = frappe.db.count(
				"GP Task", {"assigned_to": current_user, "due_date": today, "status": ["!=", "Done"]}
			)

			# Get recent tasks
			recent_tasks = frappe.get_all(
				"GP Task",
				filters={"assigned_to": current_user},
				fields=["name", "title", "status", "due_date", "priority"],
				order_by="modified desc",
				limit=5,
			)

			return {
				"success": True,
				"summary": {
					"status_counts": status_counts,
					"overdue_count": overdue_count,
					"due_today_count": due_today_count,
					"total_active": status_counts.get("backlog", 0)
					+ status_counts.get("todo", 0)
					+ status_counts.get("in_progress", 0),
					"recent_tasks": recent_tasks,
				},
			}

		except Exception as e:
			frappe.log_error(f"Failed to get task summary: {str(e)}", "Juno Task Tools")
			return {"success": False, "error": str(e)}

	@staticmethod
	def _find_task(identifier: str):
		"""Find a task by ID or title"""
		# Try to find by name first
		if frappe.db.exists("GP Task", identifier):
			return frappe.get_doc("GP Task", identifier)

		# Try to find by title
		current_user = frappe.session.user
		tasks = frappe.get_all(
			"GP Task",
			filters={"title": ["like", f"%{identifier}%"], "assigned_to": current_user},
			fields=["name"],
			limit=1,
		)

		if tasks:
			return frappe.get_doc("GP Task", tasks[0].name)

		return None

	@staticmethod
	def _parse_date(date_str: str):
		"""Parse date string into date object"""
		try:
			# Handle common date formats
			if date_str.lower() == "today":
				return datetime.now().date()
			elif date_str.lower() == "tomorrow":
				return (datetime.now() + timedelta(days=1)).date()
			elif "next week" in date_str.lower():
				return (datetime.now() + timedelta(days=7)).date()

			# Try to parse standard date format
			return frappe.utils.getdate(date_str)
		except:
			return None

	@staticmethod
	def _get_project_name(project_identifier: str):
		"""Get project name by ID or title"""
		# If it's already a valid project ID
		if frappe.db.exists("GP Project", project_identifier):
			return project_identifier

		# Try to find by title
		project_name = frappe.db.get_value("GP Project", {"title": project_identifier}, "name")
		return project_name


# Whitelist functions for API access
@frappe.whitelist()
def get_user_tasks(**kwargs):
	"""API endpoint for getting user tasks"""
	return GPTaskTools.get_user_tasks(**kwargs)


@frappe.whitelist()
def create_task(**kwargs):
	"""API endpoint for creating tasks"""
	return GPTaskTools.create_task(**kwargs)


@frappe.whitelist()
def update_task(**kwargs):
	"""API endpoint for updating tasks"""
	return GPTaskTools.update_task(**kwargs)


@frappe.whitelist()
def search_tasks(**kwargs):
	"""API endpoint for searching tasks"""
	return GPTaskTools.search_tasks(**kwargs)


@frappe.whitelist()
def get_task_summary():
	"""API endpoint for getting task summary"""
	return GPTaskTools.get_task_summary()
