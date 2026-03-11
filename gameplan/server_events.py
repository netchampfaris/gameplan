import json
import time
from contextlib import suppress

import frappe
from frappe.utils.background_jobs import get_redis_connection_without_auth
from frappe.website.page_renderers.base_renderer import BaseRenderer
from werkzeug.wrappers import Response  # pyright: ignore[reportMissingImports]

HEARTBEAT_INTERVAL = 20
RETRY_INTERVAL_MS = 3000
STREAM_PATH = "g-events"
STREAM_CHANNEL = "gameplan_sse_events"
ROOM_ALL = "all"
ROOM_WEBSITE = "website"


class GPServerEventsPage(BaseRenderer):
	def can_render(self):
		return self.path == STREAM_PATH

	def render(self):
		if frappe.session.user == "Guest":
			raise frappe.PermissionError

		site = frappe.local.site
		user = str(frappe.session.user)
		allowed_rooms = {get_user_room(user), ROOM_ALL, ROOM_WEBSITE}
		pubsub = get_redis_connection_without_auth().pubsub(ignore_subscribe_messages=True)
		pubsub.subscribe(STREAM_CHANNEL)

		def stream():
			last_heartbeat_at = time.monotonic()
			try:
				yield f"retry: {RETRY_INTERVAL_MS}\n\n"
				yield format_sse_event("connected", {"user": user})

				while True:
					message = pubsub.get_message(timeout=1.0)
					if not message:
						if time.monotonic() - last_heartbeat_at >= HEARTBEAT_INTERVAL:
							yield ": keepalive\n\n"
							last_heartbeat_at = time.monotonic()
						continue

					payload = parse_redis_message(message.get("data"))
					if not payload:
						continue
					if payload.get("namespace") != site:
						continue
					if not can_deliver_event(payload, user, allowed_rooms):
						continue

					key = payload.get("key")
					if not key:
						continue

					yield format_sse_event(key, payload.get("value"))
					last_heartbeat_at = time.monotonic()
			finally:
				pubsub.close()

		response = Response(stream(), mimetype="text/event-stream")
		response.headers["Cache-Control"] = "no-cache, no-transform"
		response.headers["Connection"] = "keep-alive"
		response.headers["X-Accel-Buffering"] = "no"
		response.headers["X-Page-Name"] = STREAM_PATH
		return response


def format_sse_event(event: str, data):
	payload = "null" if data is None else frappe.as_json(data)
	lines = [f"event: {event}"]
	for line in payload.splitlines() or [""]:
		lines.append(f"data: {line}")
	lines.append("")
	return "\n".join(lines)


def parse_redis_message(message):
	if not message:
		return None
	if isinstance(message, bytes):
		message = message.decode()
	try:
		return json.loads(message)
	except json.JSONDecodeError:
		return None


def emit_event_via_redis(key: str, value=None, user=None, room: str | None = None):
	users = normalize_users(user)
	payload = {
		"namespace": frappe.local.site,
		"key": key,
		"value": value,
		"users": users,
		"room": room,
	}

	with suppress(Exception):
		get_redis_connection_without_auth().publish(STREAM_CHANNEL, frappe.as_json(payload))


def normalize_users(user=None) -> list[str]:
	if not user:
		return []
	if isinstance(user, (list | tuple | set)):
		return [str(u) for u in user if u]
	return [str(user)]


def get_user_room(user: str):
	return f"user:{user}"


def can_deliver_event(payload, user: str, allowed_rooms: set[str]):
	users = payload.get("users") or []
	if user in users:
		return True

	room = payload.get("room")
	return bool(room and room in allowed_rooms)
