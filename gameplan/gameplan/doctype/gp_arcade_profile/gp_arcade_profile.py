# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""A user's Arcade settings: how their Avatar looks, how their Home is furnished, when
they last read their Guestbook, their Collection (the items they have unlocked), and the
birthday and work anniversary they chose to share, if any.

One row per user, named after them. The appearance is stored as the part numbers of
the Arcade catalog (`arcade/avatar/catalog.ts`), and the Home as ids from the furniture
catalog (`arcade/maps/prefabs.ts` and `arcade/maps/rooms.ts`). The server only checks
their shape and bounds; the client decides whether it can draw them, since the catalogs
live there, and it skips anything it does not know.

Unlocks are the exception: the client may not add them. Only `grant_item`, called from
server code, adds a row to `unlocks`.

The dates are the other exception. They are at permlevel 1, which only System Managers
have, so the document and list APIs leave them out for everyone else, the player included.
The player reads and sets their own through `get_dates` and `set_dates`; other players only
see the party in the Common Room on the day (`celebrations_on`).
"""

import calendar
import json
import os
import re
from datetime import date

import frappe
from frappe import _, realtime
from frappe.model.document import Document

import gameplan
from gameplan.arcade import player_today

SINGLE_PARTS = ("body", "eyes")
COLORED_PARTS = ("outfit", "hairstyle", "accessory")
# Part numbers come from the pack's file names, which stay well under this.
MAX_PART_NUMBER = 99

# The Home room, walls included, in tiles. Mirrors HOME_WIDTH and HOME_HEIGHT in
# `arcade/maps/home.ts`.
HOME_WIDTH = 14
HOME_HEIGHT = 13
MAX_HOME_ITEMS = 60
# Catalog ids: lowercase words joined by hyphens, e.g. "couch-gray".
CATALOG_ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_CATALOG_ID_LENGTH = 60
MEMBER_ROLES = ("Gameplan Member", "Gameplan Admin")
# Where an unlock came from, as `kind:detail`: "season:halloween-2026", "puzzle:2026-10-03",
# "darts:2026-W41".
UNLOCK_SOURCE = re.compile(r"^[a-z]+:[A-Za-z0-9-]+$")
MAX_UNLOCK_SOURCE_LENGTH = 140
# Sent to the player's open tabs when they unlock an item. `arcade/hud/useUnlockNotices.ts`
# listens for it.
ITEM_UNLOCKED = "arcade:item_unlocked"
# A birthday or work anniversary: "MM-DD", never a year of birth.
MONTH_DAY = re.compile(r"^\d{2}-\d{2}$")
DATE_FIELDS = ("birthday", "work_anniversary", "work_start_year")
FIRST_START_YEAR = 1950
# What a celebrant unlocks on their day, by occasion. The source is `<occasion>:<year>`.
CELEBRATION_ITEMS = {"birthday": "birthday-cake", "anniversary": "anniversary-plaque"}


class GPArcadeProfile(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from gameplan.gameplan.doctype.gp_arcade_unlock.gp_arcade_unlock import GPArcadeUnlock

		appearance: DF.JSON | None
		birthday: DF.Data | None
		guestbook_read_at: DF.Datetime | None
		home: DF.JSON | None
		unlocks: DF.Table[GPArcadeUnlock]
		user: DF.Link
		work_anniversary: DF.Data | None
		work_start_year: DF.Int
	# end: auto-generated types

	def validate(self):
		self.validate_unlocks()
		self.validate_dates()
		if self.appearance and not is_appearance(frappe.parse_json(self.appearance)):
			frappe.throw(_("Appearance is not valid"), frappe.ValidationError)
		if self.home:
			home = frappe.parse_json(self.home)
			if isinstance(home, dict) and isinstance(home.get("items"), list):
				if len(home["items"]) > MAX_HOME_ITEMS:
					frappe.throw(
						_("A Home holds at most {0} things").format(MAX_HOME_ITEMS), frappe.ValidationError
					)
			if not is_home(home):
				frappe.throw(_("Home is not valid"), frappe.ValidationError)

	def validate_unlocks(self):
		"""Only `grant_item` adds unlocks. Any other save must leave them as they were."""
		if self.flags.granting_unlock:
			return
		if unlocked_items(self) != unlocked_items(self.get_doc_before_save()):
			frappe.throw(_("Items are unlocked by playing, not by saving"), frappe.PermissionError)

	def validate_dates(self):
		for fieldname, label in (("birthday", _("Birthday")), ("work_anniversary", _("Work anniversary"))):
			value = (self.get(fieldname) or "").strip() or None
			if value and not is_month_day(value):
				frappe.throw(_("{0} must be a day and month").format(label), frappe.ValidationError)
			self.set(fieldname, value)
		# A start year only counts the years of an anniversary.
		if not self.work_anniversary:
			self.work_start_year = 0
		if (
			self.work_start_year
			and not FIRST_START_YEAR <= self.work_start_year <= gameplan.arcade.utc_today().year
		):
			frappe.throw(
				_("The start year must be between {0} and this year").format(FIRST_START_YEAR),
				frappe.ValidationError,
			)


def unlocked_items(profile) -> set[tuple[str, str]]:
	return {(row.item, row.source) for row in profile.unlocks} if profile else set()


def grant_item(user: str, item: str, source: str) -> bool:
	"""Unlock a lockable Home item for `user`: the one way to add to a Collection.

	For server code and scheduled jobs only. It is not whitelisted, so a client cannot
	grant itself items. `item` must be listed in `arcade/data/lockable-items.json`, and
	`source` says what unlocked it (see `UNLOCK_SOURCE`).

	Returns False and changes nothing when the user already has the item, from any
	source. Otherwise records it, tells the player's open tabs after the commit, and
	returns True. Creates the profile if the user has none yet.
	"""
	if item not in lockable_items():
		frappe.throw(_("{0} is not a lockable item").format(item), frappe.ValidationError)
	if len(source) > MAX_UNLOCK_SOURCE_LENGTH or not UNLOCK_SOURCE.match(source):
		frappe.throw(_("Unlock source {0} is not valid").format(source), frappe.ValidationError)

	if frappe.db.exists("GP Arcade Profile", user):
		# Locked, so two grants at once cannot both add the item.
		profile = frappe.get_doc("GP Arcade Profile", user, for_update=True)
	else:
		profile = frappe.new_doc("GP Arcade Profile", user=user)
	if any(row.item == item for row in profile.unlocks):
		return False

	profile.append("unlocks", {"item": item, "source": source, "unlocked_at": frappe.utils.now_datetime()})
	profile.flags.granting_unlock = True
	profile.save(ignore_permissions=True)
	realtime.publish_realtime(
		ITEM_UNLOCKED, message={"item": item, "source": source}, user=user, after_commit=True
	)
	return True


def lockable_items() -> dict[str, dict]:
	"""The Home catalog items a player must unlock, by id, each with its `hint`.

	Read from `arcade/data/lockable-items.json`, the list the client's catalog uses too,
	so both sides agree on the ids.
	"""
	return arcade_data("lockable-items.json")


def seasons() -> dict[str, dict]:
	"""The seasons by id, from `arcade/data/seasons.json`, which the client reads too.

	Each has a `name`, the Home `items` it grants, and its days as `MM-DD` ranges:
	`dates` for the same days every year, or `years` for days that move, by the year
	the season starts in. Ranges are inclusive; one whose end comes before its start
	ends the next year.
	"""
	return arcade_data("seasons.json")


def arcade_data(file_name: str):
	# Not `get_app_path(..., file_name)`: it turns hyphens into underscores.
	path = os.path.join(frappe.get_app_path("gameplan"), "..", "arcade", "data", file_name)
	with open(path) as file:
		return json.load(file)


def active_season(day: date) -> tuple[str, int] | None:
	"""The season on `day` and the year it started in, or None. Mirrors `seasonOn` in
	`arcade/config/seasons.ts`.

	The year names the season's run in unlock sources: New Year's Day 2027 is still
	`christmas-2026`.
	"""
	for start_year in (day.year, day.year - 1):
		for season_id, season in seasons().items():
			days = season.get("years", {}).get(str(start_year)) or season.get("dates")
			if not days:
				continue
			end_year = start_year + 1 if days["to"] < days["from"] else start_year
			start = date.fromisoformat(f"{start_year}-{days['from']}")
			end = date.fromisoformat(f"{end_year}-{days['to']}")
			if start <= day <= end:
				return season_id, start_year
	return None


def is_month_day(value) -> bool:
	"""Whether `value` is a day of the year as `MM-DD`. February 29 counts."""
	if not isinstance(value, str) or not MONTH_DAY.match(value):
		return False
	try:
		# 2000 was a leap year, so February 29 parses.
		date.fromisoformat(f"2000-{value}")
	except ValueError:
		return False
	return True


def celebrated_days(day: date) -> list[str]:
	"""The `MM-DD` dates celebrated on `day`: its own, and February 29 on February 28 of a
	year that has no February 29."""
	days = [day.strftime("%m-%d")]
	if days[0] == "02-28" and not calendar.isleap(day.year):
		days.append("02-29")
	return days


def celebrations_on(day: date) -> list[dict]:
	"""Everyone celebrating on `day`: birthdays first, then work anniversaries, each by name.

	Each is `{celebrant, full_name, occasion, years}`, where `occasion` is "birthday" or
	"anniversary" and `years` counts an anniversary's years when the player gave a start
	year (else None). Only people who can enter the Arcade are celebrated.
	"""
	days = celebrated_days(day)
	profiles = frappe.get_all(
		"GP Arcade Profile",
		or_filters={"birthday": ["in", days], "work_anniversary": ["in", days]},
		fields=["user", "birthday", "work_anniversary", "work_start_year"],
	)
	names = dict(
		frappe.get_all(
			"User",
			filters={"name": ["in", [profile.user for profile in profiles] or [""]], "enabled": 1},
			fields=["name", "full_name"],
			as_list=True,
		)
	)
	celebrations = []
	for profile in profiles:
		if profile.user not in names or not can_enter_arcade(profile.user):
			continue
		full_name = names[profile.user] or profile.user
		if profile.birthday in days:
			celebrations.append(
				{"celebrant": profile.user, "full_name": full_name, "occasion": "birthday", "years": None}
			)
		if profile.work_anniversary in days:
			years = day.year - profile.work_start_year if profile.work_start_year else 0
			celebrations.append(
				{
					"celebrant": profile.user,
					"full_name": full_name,
					"occasion": "anniversary",
					"years": years if years > 0 else None,
				}
			)
	celebrations.sort(key=lambda row: (row["occasion"] != "birthday", row["full_name"], row["celebrant"]))
	return celebrations


def is_appearance(value) -> bool:
	"""Whether `value` has the shape of a catalog appearance.

	`body` and `eyes` are part numbers; `outfit`, `hairstyle` and the optional
	`accessory` are `{"style": n, "color": n}`.
	"""
	if not isinstance(value, dict) or not set(value) <= {*SINGLE_PARTS, *COLORED_PARTS}:
		return False
	if not all(is_part_number(value.get(key)) for key in SINGLE_PARTS):
		return False
	for key in COLORED_PARTS:
		part = value.get(key)
		if part is None and key == "accessory":
			continue
		if not isinstance(part, dict) or set(part) != {"style", "color"}:
			return False
		if not (is_part_number(part["style"]) and is_part_number(part["color"])):
			return False
	return True


def is_part_number(value) -> bool:
	return is_int(value) and 1 <= value <= MAX_PART_NUMBER


def is_home(value) -> bool:
	"""Whether `value` has the shape of a Home layout.

	`{"wallpaper": id, "floor": id, "items": [{"prefab": id, "x": n, "y": n}]}`, where
	`x`, `y` are tiles from the room's top-left corner, walls included.
	"""
	if not isinstance(value, dict) or set(value) != {"wallpaper", "floor", "items"}:
		return False
	if not (is_catalog_id(value["wallpaper"]) and is_catalog_id(value["floor"])):
		return False
	items = value["items"]
	return isinstance(items, list) and len(items) <= MAX_HOME_ITEMS and all(map(is_home_item, items))


def is_home_item(value) -> bool:
	return (
		isinstance(value, dict)
		and set(value) == {"prefab", "x", "y"}
		and is_catalog_id(value["prefab"])
		and is_int(value["x"])
		and is_int(value["y"])
		and 0 <= value["x"] < HOME_WIDTH
		and 0 <= value["y"] < HOME_HEIGHT
	)


def is_catalog_id(value) -> bool:
	return isinstance(value, str) and len(value) <= MAX_CATALOG_ID_LENGTH and bool(CATALOG_ID.match(value))


def is_int(value) -> bool:
	return isinstance(value, int) and not isinstance(value, bool)


def has_permission(doc, ptype="read", user=None, **kwargs):
	"""Anyone in Gameplan may see how anyone else looks; only you may set your own look.

	The role permissions already keep outsiders out and guests read-only. This hook
	narrows writes: create and write only for the profile's own user, delete by that
	user or a System Manager.
	"""
	user = user or frappe.session.user
	if not hasattr(doc, "doctype"):
		return True
	if ptype in ("read", "select", "print", "email", "export", "report", "share"):
		return True
	if ptype == "delete":
		return doc.user == user or "System Manager" in frappe.get_roles(user)
	return doc.user == user


@frappe.whitelist()
def get_player():
	"""Who the session user is in the Arcade.

	Called by the realtime server when a socket joins a Room (see
	`realtime/arcade.js`), with that socket's session. Refuses anyone who cannot
	enter the Arcade: Guests and Gameplan guests.
	"""
	user = frappe.session.user
	check_arcade_access()
	full_name = frappe.db.get_value("User", user, "full_name")
	return {"user": user, "full_name": full_name or user}


@frappe.whitelist()
def get_home(user: str):
	"""A person's Home, for visiting it.

	`home` is null until they save one; the client then shows a starter Home. Only
	people who can enter the Arcade have a Home.
	"""
	check_arcade_access()
	full_name = frappe.db.get_value("User", {"name": user, "enabled": 1}, "full_name")
	if full_name is None or not can_enter_arcade(user):
		frappe.throw(_("There is no Home here"), frappe.DoesNotExistError)
	home = frappe.db.get_value("GP Arcade Profile", user, "home")
	return {"user": user, "full_name": full_name or user, "home": frappe.parse_json(home) if home else None}


@frappe.whitelist()
def get_home_directory():
	"""Everyone with a Home: every enabled Gameplan member, with their Avatar's look.

	`appearance` is null for people who have not picked a look; the client draws
	their default one.
	"""
	check_arcade_access()
	members = frappe.get_all(
		"Has Role",
		filters={"parenttype": "User", "role": ["in", MEMBER_ROLES]},
		pluck="parent",
		distinct=True,
	)
	users = frappe.get_all(
		"User",
		filters={"name": ["in", members or [""]], "enabled": 1},
		fields=["name", "full_name"],
		order_by="full_name asc",
	)
	appearances = dict(
		frappe.get_all(
			"GP Arcade Profile",
			filters={"user": ["in", [user.name for user in users] or [""]]},
			fields=["user", "appearance"],
			as_list=True,
		)
	)
	return [
		{
			"user": user.name,
			"full_name": user.full_name or user.name,
			"appearance": frappe.parse_json(appearances[user.name]) if appearances.get(user.name) else None,
		}
		for user in users
	]


@frappe.whitelist(methods=["POST"])
def claim_season_items(today: str):
	"""Unlock the current season's Home items for the session user, once per item.

	The client calls this on entering the Arcade and sends only its local date; the
	server decides the season from it, so a client cannot claim another season's
	items. Returns the items unlocked just now; each also shows up as a notice in the
	player's tabs (see `grant_item`).
	"""
	check_arcade_access()
	season = active_season(player_today(today))
	if not season:
		return []
	season_id, start_year = season
	source = f"season:{season_id}-{start_year}"
	return [item for item in seasons()[season_id]["items"] if grant_item(frappe.session.user, item, source)]


@frappe.whitelist()
def get_dates():
	"""The session user's own birthday and work anniversary (`MM-DD`), and the year they
	started, each null when not set. Nobody else's: see the module docstring."""
	check_arcade_access()
	values = frappe.db.get_value("GP Arcade Profile", frappe.session.user, DATE_FIELDS, as_dict=True) or {}
	return {
		"birthday": values.get("birthday") or None,
		"work_anniversary": values.get("work_anniversary") or None,
		"work_start_year": values.get("work_start_year") or None,
	}


@frappe.whitelist(methods=["POST"])
def set_dates(birthday: str | None = None, work_anniversary: str | None = None, work_start_year=None):
	"""Set or clear the session user's birthday and work anniversary. Empty clears one.

	Creates the profile if the user has none yet. Returns the dates as `get_dates` does.
	"""
	check_arcade_access()
	user = frappe.session.user
	if work_start_year in (None, ""):
		work_start_year = 0
	elif isinstance(work_start_year, str) and work_start_year.isdigit():
		work_start_year = int(work_start_year)
	elif not is_int(work_start_year):
		frappe.throw(_("The start year must be a year"), frappe.ValidationError)
	if frappe.db.exists("GP Arcade Profile", user):
		profile = frappe.get_doc("GP Arcade Profile", user, for_update=True)
	else:
		profile = frappe.new_doc("GP Arcade Profile", user=user)
	profile.update(
		{"birthday": birthday, "work_anniversary": work_anniversary, "work_start_year": work_start_year}
	)
	# The dates are at a permlevel only System Managers have; this is the player's own profile.
	profile.save(ignore_permissions=True)
	return get_dates()


@frappe.whitelist(methods=["POST"])
def claim_celebration_items(today: str):
	"""On the session user's birthday or work anniversary, unlock its Home item.

	The client calls this on entering the Arcade with its local date, as for seasons. The
	server checks the date and the player's own saved dates. Returns the items unlocked
	just now.
	"""
	check_arcade_access()
	day = player_today(today)
	user = frappe.session.user
	return [
		CELEBRATION_ITEMS[row["occasion"]]
		for row in celebrations_on(day)
		if row["celebrant"] == user
		and grant_item(user, CELEBRATION_ITEMS[row["occasion"]], f"{row['occasion']}:{day.year}")
	]


def check_arcade_access():
	user = frappe.session.user
	if user == "Guest" or not can_enter_arcade(user):
		frappe.throw(_("Only Gameplan members can enter the Arcade"), frappe.PermissionError)


def can_enter_arcade(user: str) -> bool:
	if user == "Administrator":
		return True
	roles = set(frappe.get_roles(user))
	return bool(roles & {"Gameplan Member", "Gameplan Admin", "System Manager"}) and not gameplan.is_guest(
		user
	)
