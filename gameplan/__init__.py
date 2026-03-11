import frappe

from gameplan.server_events import emit_event_via_redis, normalize_users

__version__ = "0.0.1"


def is_guest(user=None):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return False
	roles = frappe.get_roles(user)
	if "Gameplan Member" in roles or "Gameplan Admin" in roles:
		return False
	return "Gameplan Guest" in roles


def refetch_resource(cache_key: str | list, user=None):
	frappe.publish_realtime(
		"refetch_resource", {"cache_key": cache_key}, user=user or frappe.session.user, after_commit=True
	)


def send_event(key: str, value=None, user=None, room: str | None = None, after_commit: bool = True):
	if not key:
		return

	users = normalize_users(user)
	if not users and room is None:
		users = [str(frappe.session.user)]

	if after_commit:
		queue_event_after_commit(key, value, users, room)
		return

	emit_event_via_redis(key, value, user=users, room=room)


def queue_event_after_commit(key: str, value, users: list[str], room: str | None):
	if not hasattr(frappe.local, "_gameplan_sse_log"):
		frappe.local._gameplan_sse_log = []
		frappe.db.after_commit.add(flush_sse_log)
		frappe.db.after_rollback.add(clear_sse_log)

	payload = [key, value, users, room]
	if payload not in frappe.local._gameplan_sse_log:
		frappe.local._gameplan_sse_log.append(payload)


def flush_sse_log():
	if not hasattr(frappe.local, "_gameplan_sse_log"):
		return

	for key, value, users, room in frappe.local._gameplan_sse_log:
		emit_event_via_redis(key, value, user=users, room=room)

	clear_sse_log()


def clear_sse_log():
	if hasattr(frappe.local, "_gameplan_sse_log"):
		del frappe.local._gameplan_sse_log
