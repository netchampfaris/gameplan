# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt


import frappe

from gameplan.utils.sqlite import SQLiteSearch

from .base_search import BaseSearch

INDEX_BUILD_FLAG = "discussions_index_in_progress"


class GameplanSearch(BaseSearch):
	def __init__(self) -> None:
		super().__init__(SQLiteSearch)


def build_index():
	frappe.cache().set_value(INDEX_BUILD_FLAG, True)
	search = GameplanSearch()
	search.build_index()
	frappe.cache().set_value(INDEX_BUILD_FLAG, False)


def build_index_in_background():
	if not frappe.cache().get_value("discussions_index_in_progress"):
		frappe.enqueue(build_index, queue="long")


def build_index_if_not_exists():
	search = GameplanSearch()
	if not search.index_exists() or not frappe.cache.exists(INDEX_BUILD_FLAG):
		build_index()


def drop_index():
	search = GameplanSearch()
	search.drop_index()


@frappe.whitelist()
def search(query, title_only=False):
	search = GameplanSearch()
	return search.search(query, title_only=title_only)
