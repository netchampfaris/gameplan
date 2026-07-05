# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

"""Public contract for Gameplan demo data.

External callers depend on the names in this module:
- ``gameplan/hooks.py`` schedules :func:`generate_data_daily`.
- ``gameplan/www/g.py`` uses :func:`demo_data_enabled` and :func:`get_random_users`.

The actual replay lives in :mod:`gameplan.demo.seeder`.
"""

import os

import frappe

from gameplan.demo.seeder import DEMO_EMAIL_DOMAIN, DEMO_FILE_FOLDER, MAYA_EMAIL, Seeder

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixture")

# Every Gameplan doctype table is truncated on clear; these carry an
# autoincrement sequence that must restart so names stay stable across reseeds.
_SEQUENCE_DOCTYPES = [
	"GP Discussion",
	"GP Comment",
	"GP Poll",
	"GP Task",
	"GP Page",
	"GP Project",
	"GP Custom Emoji",
	"GP Notification",
	"GP Draft",
]


def generate(fixture_path: str | None = None, force: bool = False):
	"""Clear existing demo data and replay the event-log fixture.

	``fixture_path`` points at a directory containing ``events.jsonl`` and a
	``files/`` folder; it defaults to the bundled fixture. Refuses politely (no
	error) if the fixture is missing.
	"""
	_assert_not_in_migration()

	fixture_dir = fixture_path or FIXTURE_DIR
	events_path = os.path.join(fixture_dir, "events.jsonl")
	if not os.path.exists(events_path):
		print(f"Demo fixture not found at {events_path} — nothing to generate.")
		return

	clear(force=force)

	search_was_disabled = frappe.conf.get("disable_gameplan_search")
	mute_emails_before = frappe.flags.mute_emails
	frappe.conf.disable_gameplan_search = True
	frappe.flags.mute_emails = True
	try:
		seeder = Seeder(fixture_dir)
		seeder.run(events_path)
		frappe.db.commit()
	finally:
		frappe.conf.disable_gameplan_search = search_was_disabled
		frappe.flags.mute_emails = mute_emails_before

	_rebuild_search_index()
	print(f"Demo data generated: {dict(seeder.counts)}")


def clear(force: bool = False):
	"""Delete all Gameplan data and the demo users, files and folder.

	Unless ``force`` is set, aborts if the site looks like it holds real data
	(a discussion authored by a non-demo user).
	"""
	if not force and _has_real_data():
		print("Refusing to clear: non-demo Gameplan data detected. Pass force=True to override.")
		return

	# Raw deletes (no FKs between Frappe tables), so table order does not matter.
	for doctype in _gameplan_doctypes():
		frappe.db.delete(doctype)

	for user in _demo_user_emails():
		frappe.delete_doc("User", user, ignore_permissions=True, force=True, delete_permanently=True)

	_delete_demo_files()
	_reset_sequences()
	frappe.db.commit()


def generate_data_daily():
	"""Scheduler entry point: regenerate demo data on sites that opt in."""
	if not demo_data_enabled():
		return

	generate(force=True)


def demo_data_enabled() -> bool:
	return bool(frappe.conf.get("gameplan_demo_enabled", False))


def get_random_users(limit: int | None = None) -> list[str]:
	"""Return demo user emails, always with Maya first (she is the demo viewer)."""
	emails = frappe.get_all(
		"User",
		filters={"enabled": 1, "email": ["like", f"%{DEMO_EMAIL_DOMAIN}"]},
		pluck="email",
		order_by="creation asc",
	)
	ordered = [MAYA_EMAIL] if MAYA_EMAIL in emails else []
	ordered += [email for email in emails if email != MAYA_EMAIL]
	return ordered[:limit] if limit else ordered


# ---- internals --------------------------------------------------------------


def _assert_not_in_migration():
	# Unread records and other side effects early-return under in_migrate/in_patch,
	# which would silently produce a broken, half-seeded demo.
	if frappe.flags.in_migrate or frappe.flags.in_patch:
		frappe.throw("Demo data cannot be generated during migrate/patch.")


def _gameplan_doctypes() -> list[str]:
	return frappe.get_all("DocType", filters={"module": "Gameplan", "issingle": 0}, pluck="name")


def _demo_user_emails() -> list[str]:
	return frappe.get_all("User", filters={"email": ["like", f"%{DEMO_EMAIL_DOMAIN}"]}, pluck="email")


def _has_real_data() -> bool:
	rows = frappe.db.sql(
		"SELECT 1 FROM `tabGP Discussion` WHERE owner NOT LIKE %s LIMIT 1",
		f"%{DEMO_EMAIL_DOMAIN}",
	)
	return bool(rows)


def _delete_demo_files():
	if not frappe.db.exists("File", DEMO_FILE_FOLDER):
		return
	for name in frappe.get_all("File", filters={"folder": DEMO_FILE_FOLDER}, pluck="name"):
		frappe.delete_doc("File", name, ignore_permissions=True, force=True, delete_permanently=True)
	frappe.delete_doc("File", DEMO_FILE_FOLDER, ignore_permissions=True, force=True)


def _reset_sequences():
	for doctype in _SEQUENCE_DOCTYPES:
		sequence = frappe.scrub(doctype) + "_id_seq"
		try:
			frappe.db.sql(f"ALTER SEQUENCE `{sequence}` RESTART WITH 1")
		except Exception:
			# Sequence may not exist on this DB backend; ignore.
			pass


def _rebuild_search_index():
	from gameplan.search_sqlite import build_index

	try:
		build_index()
	except Exception:
		frappe.log_error(title="Demo Search Index Rebuild Error")
