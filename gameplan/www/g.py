# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import json

import frappe
from frappe.utils.telemetry import capture

no_cache = 1


def get_context():
	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()
	context = frappe._dict()
	context.boot = get_boot()
	context.boot.csrf_token = csrf_token

	is_production = not frappe.local.dev_server
	if is_production:
		manifest = get_manifest()
		context.update(
			{
				"manifest": manifest,
				"entry_file": manifest["index.html"]["file"],
				"entry_css": manifest["index.html"].get("css", []),
				"production": is_production,
			}
		)
	if frappe.session.user != "Guest":
		capture("active_site", "gameplan")
	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only meant for developer mode")
	return get_boot()


def get_boot():
	return frappe._dict(
		{
			"frappe_version": frappe.__version__,
			"default_route": get_default_route(),
			"site_name": frappe.local.site,
			"read_only_mode": frappe.flags.read_only,
			"gameplan_frontend_sentry_dsn": frappe.conf.gameplan_frontend_sentry_dsn,
		}
	)


def get_manifest():
	app_path = frappe.get_app_path("gameplan")
	manifest_path = app_path + "/public/frontend/manifest.json"
	manifest = frappe.read_file(manifest_path)
	if not manifest:
		frappe.throw("gameplan/public/frontend/manifest.json not found")
	return json.loads(manifest)


def on_login(login_manager):
	frappe.response["default_route"] = get_default_route()


def get_default_route():
	if not frappe.db.get_all("GP Team", limit=1):
		return "/onboarding"
	else:
		return "/home"
