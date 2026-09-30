# Copyright (c) 2026, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

"""The shared plant in the Common Room: one plant for the whole Arcade, grown by everyone.

Each document is one growth cycle. A player waters it at most once per local day, and it
grows one stage for each distinct day someone watered it. At the last stage it blooms,
everyone who watered it in that cycle gets a cutting (a lockable Home item), and the next
day a new cycle starts with the next species in `arcade/data/plants.json`.

A plant nobody waters for `DROOP_AFTER_DAYS` days droops until someone waters it. It never
dies and never loses a stage.

The client reads and changes it only through `get_plant` and `water_plant`; the doctype
itself is for System Managers.
"""

from datetime import date

import frappe
from frappe import _
from frappe.model.document import Document

from gameplan.arcade import player_today
from gameplan.gameplan.doctype.gp_arcade_profile.gp_arcade_profile import (
	arcade_data,
	check_arcade_access,
	grant_item,
)

# From a sprout (1) to full grown (5). The plant blooms on reaching the last stage.
STAGES = 5
DROOP_AFTER_DAYS = 3


class GPArcadePlant(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from gameplan.gameplan.doctype.gp_arcade_plant_watering.gp_arcade_plant_watering import (
			GPArcadePlantWatering,
		)

		bloomed_on: DF.Date | None
		cycle: DF.Int
		species: DF.Data
		started_on: DF.Date
		waterings: DF.Table[GPArcadePlantWatering]
	# end: auto-generated types

	@property
	def stage(self) -> int:
		return min(1 + len(self.watered_days()), STAGES)

	def watered_days(self) -> set[date]:
		return {as_date(row.day) for row in self.waterings}

	def contributors(self) -> list[str]:
		"""Everyone who watered it this cycle, in the order they first did."""
		return list(dict.fromkeys(row.user for row in self.waterings))

	def water(self, user: str, day: date):
		if any(row.user == user and as_date(row.day) == day for row in self.waterings):
			frappe.throw(_("You already watered the plant today"), frappe.ValidationError)
		self.append("waterings", {"user": user, "day": day, "watered_at": frappe.utils.now_datetime()})
		if self.stage == STAGES:
			self.bloomed_on = day


def species_list() -> list[dict]:
	"""The species the plant cycles through, each with an `id`, a `name` and the `item` its
	cutting unlocks. Read from `arcade/data/plants.json`, which the client reads too."""
	return arcade_data("plants.json")


def species_of(cycle: int) -> dict:
	species = species_list()
	return species[(cycle - 1) % len(species)]


def latest_plant(for_update: bool = False) -> GPArcadePlant | None:
	name = frappe.db.get_value("GP Arcade Plant", {}, "name", order_by="cycle desc")
	return frappe.get_doc("GP Arcade Plant", name, for_update=for_update) if name else None


def next_plant(previous: GPArcadePlant | None, day: date) -> GPArcadePlant:
	"""The cycle after `previous`, not yet saved: what a player sees until someone waters it."""
	cycle = previous.cycle + 1 if previous else 1
	return frappe.new_doc("GP Arcade Plant", cycle=cycle, species=species_of(cycle)["id"], started_on=day)


def plant_on(day: date, for_update: bool = False) -> GPArcadePlant:
	"""The plant as a player sees it on `day`. A plant that bloomed stays in bloom for the
	rest of that day; from the next day on, the new cycle's sprout takes its place."""
	plant = latest_plant(for_update)
	if plant is None or (plant.bloomed_on and day > as_date(plant.bloomed_on)):
		return next_plant(plant, day)
	return plant


def is_drooping(plant: GPArcadePlant, day: date) -> bool:
	if plant.bloomed_on:
		return False
	last_cared = max(plant.watered_days(), default=None)
	if last_cared is None:
		# A fresh sprout counts from the day its cycle began, or the previous bloom.
		previous = frappe.db.get_value("GP Arcade Plant", {"cycle": plant.cycle - 1}, "bloomed_on")
		last_cared = as_date(previous or plant.started_on)
	return (day - last_cared).days >= DROOP_AFTER_DAYS


def plant_status(plant: GPArcadePlant, day: date) -> dict:
	"""What the client draws and shows for the plant on `day`."""
	today = [row.user for row in plant.waterings if as_date(row.day) == day]
	names = dict(
		frappe.get_all(
			"User", filters={"name": ["in", today or [""]]}, fields=["name", "full_name"], as_list=True
		)
	)
	return {
		# A frappe bug: on insert, `BaseDocument._sync_autoname_field` sets the naming field to
		# the name, so the Int `cycle` becomes a string. Not yet fixed upstream.
		"cycle": frappe.utils.cint(plant.cycle),
		"species": species_of_plant(plant),
		"stage": plant.stage,
		"stages": STAGES,
		"drooping": is_drooping(plant, day),
		"bloomed": bool(plant.bloomed_on),
		"watered_today": [{"user": user, "full_name": names.get(user) or user} for user in today],
		"watered_by_me": frappe.session.user in today,
	}


@frappe.whitelist()
def get_plant(today: str):
	"""The shared plant on the player's local `today`."""
	check_arcade_access()
	day = player_today(today)
	return plant_status(plant_on(day), day)


@frappe.whitelist(methods=["POST"])
def water_plant(today: str):
	"""Water the shared plant for the session user, once per local day.

	Watering on a day nobody else has grows it a stage. The watering that brings it to
	full growth makes it bloom and grants each contributor that species' cutting.
	"""
	check_arcade_access()
	day = player_today(today)
	# Locked, so two waterings at once cannot both miss each other's day or bloom twice.
	# The unique cycle stops two first waterings of a new cycle from both creating it.
	plant = plant_on(day, for_update=True)
	if plant.bloomed_on:
		frappe.throw(_("The plant is in bloom. A new one sprouts tomorrow."), frappe.ValidationError)

	plant.water(frappe.session.user, day)
	plant.save(ignore_permissions=True)
	if plant.bloomed_on:
		item = species_of_plant(plant)["item"]
		for user in plant.contributors():
			grant_item(user, item, f"plant:{plant.cycle}")
	return plant_status(plant, day)


def species_of_plant(plant: GPArcadePlant) -> dict:
	return next(s for s in species_list() if s["id"] == plant.species)


def as_date(value) -> date:
	return frappe.utils.getdate(value)
