# Copyright (c) 2022, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import re
from time import sleep
from urllib.parse import urlparse

import frappe
from frappe.model.document import Document
from frappe.model.naming import append_number_if_name_exists
from frappe.query_builder.functions import Count
from frappe.website.utils import cleanup_page_name
from rq.job import JobStatus

import gameplan
from gameplan.extends.client import check_permissions
from gameplan.mixins.attachments import HasAttachments

PROFILE_BENTO_CARD_TYPES = {"Text", "Image", "Blank"}
PROFILE_BENTO_CARD_SIZES = {"1x1", "2x1", "2x2", "4x1", "4x2"}
PROFILE_BENTO_IMAGE_RENDERING = {"Cover", "Natural", "Fit"}
PROFILE_BENTO_CARD_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
PROFILE_BENTO_URL_CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x20\x7f]")
PROFILE_BENTO_ALLOWED_URL_SCHEMES = {"http", "https"}
PROFILE_BENTO_MAX_CARDS = 40


class GPUserProfile(HasAttachments, Document):
	attachments_field = "readme"

	def autoname(self):
		self.name = self.generate_name()

	def on_update(self):
		self.attach_files_in_content()

	def generate_name(self):
		full_name = frappe.db.get_value("User", self.user, "full_name")
		return append_number_if_name_exists(self.doctype, cleanup_page_name(full_name))

	@frappe.whitelist()
	def set_image(self, image):
		self.image = image
		self.is_image_background_removed = False
		self.image_background_color = None
		self.original_image = None
		self.save()
		gameplan.refetch_resource("Users")

	@frappe.whitelist()
	def remove_image_background(self, default_color=None):
		from gameplan.gameplan.doctype.gp_user_profile.profile_photo import is_rembg_available

		if not is_rembg_available():
			frappe.throw("Background removal feature is not available. Please install the rembg package.")

		if not self.image:
			frappe.throw("Profile image not found")

		job_id = f"remove-img-bg-{self.name}"
		job = frappe.enqueue(
			remove_imgbg_in_background,
			profile_name=self.name,
			default_color=default_color,
			at_front=True,
			job_id=job_id,
		)
		while True:
			status = job.get_status()
			if status in (JobStatus.QUEUED, JobStatus.STARTED, JobStatus.SCHEDULED):
				print("Waiting for job to complete:", job_id, status)
				sleep(1)
			elif status in (JobStatus.FINISHED, JobStatus.FAILED, JobStatus.CANCELED):
				print("Job status:", job_id, status)
				self.reload()
				break

	@frappe.whitelist()
	def revert_image_background(self):
		if self.original_image:
			self.image = self.original_image
			self.original_image = None
			self.is_image_background_removed = False
			self.image_background_color = None
			self.save()
			gameplan.refetch_resource("Users")

	@frappe.whitelist()
	def is_background_removal_available(self):
		from gameplan.gameplan.doctype.gp_user_profile.profile_photo import is_rembg_available

		return is_rembg_available()


def has_permission(doc, ptype="read", user=None):
	user = user or frappe.session.user

	# Everyone is allowed to read profiles.
	if ptype in ("read", "select", "print", "email", "export", "share"):
		return True

	# Administrators and Gameplan Admins can manage any profile.
	if user == "Administrator":
		return True
	if "Gameplan Admin" in frappe.get_roles(user) or "System Manager" in frappe.get_roles(user):
		return True

	# Otherwise a user may only modify their own profile.
	return doc.user == user


def create_user_profile(doc, method=None):
	if not frappe.db.exists("GP User Profile", {"user": doc.name}):
		frappe.get_doc(doctype="GP User Profile", user=doc.name).insert(ignore_permissions=True)
		frappe.db.commit()


def delete_user_profile(doc, method=None):
	exists = frappe.db.exists("GP User Profile", {"user": doc.name})
	if exists:
		return frappe.get_doc("GP User Profile", {"user": doc.name}).delete()


def on_user_update(doc, method=None):
	create_user_profile(doc)
	if any(doc.has_value_changed(field) for field in ["full_name", "enabled"]):
		profile = frappe.get_doc("GP User Profile", {"user": doc.name})
		profile.enabled = doc.enabled
		profile.full_name = doc.full_name
		profile.save(ignore_permissions=True)


@frappe.whitelist()
def get_list(
	fields=None,
	filters: dict | None = None,
	order_by=None,
	start=0,
	limit=20,
	group_by=None,
	parent=None,
	debug=False,
):
	doctype = "GP User Profile"
	check_permissions(doctype, parent)
	query = frappe.qb.get_query(
		table=doctype,
		fields=fields,
		filters=filters,
		order_by=order_by,
		offset=start,
		limit=limit,
		group_by=group_by,
	)
	data = query.run(as_dict=True, debug=debug)
	users = [d.user for d in data]

	Discussion = frappe.qb.DocType("GP Discussion")
	discussions_count = (
		frappe.qb.from_(Discussion)
		.select(Count(Discussion.name).as_("count"), Discussion.owner)
		.where(Discussion.owner.isin(users))
		.groupby(Discussion.owner)
	).run(as_dict=True)
	discussions_by_user = {d.owner: d.count for d in discussions_count}

	Comment = frappe.qb.DocType("GP Comment")
	comments_count = (
		frappe.qb.from_(Comment)
		.select(Count(Comment.name).as_("count"), Comment.owner)
		.where(Comment.owner.isin(users) & Comment.deleted_at.isnull())
		.groupby(Comment.owner)
	).run(as_dict=True)
	comments_by_user = {d.owner: d.count for d in comments_count}

	for user in data:
		user.discussions_count = discussions_by_user.get(user.user, 0)
		user.comments_count = comments_by_user.get(user.user, 0)

	return data


def remove_imgbg_in_background(profile_name, default_color=None):
	from gameplan.gameplan.doctype.gp_user_profile.profile_photo import remove_background

	profile = frappe.get_doc("GP User Profile", profile_name)
	file = frappe.get_doc("File", {"file_url": profile.image})
	profile.original_image = file.file_url
	image_content = remove_background(file)
	filename, extn = file.get_extension()
	output_filename = f"{filename}_no_bg.png"
	new_file = frappe.get_doc(
		doctype="File",
		file_name=output_filename,
		content=image_content,
		is_private=0,
		attached_to_doctype=profile.doctype,
		attached_to_name=profile.name,
	).insert()
	profile.image = new_file.file_url
	profile.is_image_background_removed = True
	profile.image_background_color = default_color
	profile.save()
	gameplan.refetch_resource("Users", user=profile.user)


@frappe.whitelist(methods=["GET", "POST"])
def get_my_bento_cards():
	profile = get_session_user_profile()
	profile.check_permission("read")
	return get_profile_bento_response(profile)


@frappe.whitelist(methods=["POST"])
def save_my_bento_cards(cards: list | str):
	profile = get_session_user_profile()
	check_profile_bento_save_permission(profile)
	profile.set("bento_cards", normalize_bento_cards(cards))
	profile.save(ignore_permissions=True)
	return get_profile_bento_response(profile)


@frappe.whitelist(methods=["GET", "POST"])
def get_bento_cards(profile: str):
	profile_doc = frappe.get_doc("GP User Profile", profile)
	profile_doc.check_permission("read")
	return get_profile_bento_response(profile_doc)


def get_session_user_profile():
	if frappe.session.user == "Guest":
		frappe.throw("Login required", frappe.PermissionError)

	if not frappe.db.exists("GP User Profile", {"user": frappe.session.user}):
		create_user_profile(frappe.get_doc("User", frappe.session.user))

	return frappe.get_doc("GP User Profile", {"user": frappe.session.user})


def get_profile_bento_cards(profile):
	cards = [profile_bento_row_to_card(row) for row in profile.get("bento_cards")]
	return cards or get_default_profile_bento_cards(profile)


def get_profile_bento_response(profile):
	return {
		"profile": profile.name,
		"cards": get_profile_bento_cards(profile),
		"is_default": not has_saved_bento_cards(profile),
	}


def has_saved_bento_cards(profile):
	return bool(profile.get("bento_cards"))


def check_profile_bento_save_permission(profile):
	user = frappe.session.user
	if user == "Guest":
		frappe.throw("Login required", frappe.PermissionError)
	if user == profile.user:
		return
	if has_permission(profile, ptype="write", user=user):
		return
	frappe.throw("Not permitted to save this profile layout", frappe.PermissionError)


def normalize_bento_cards(cards):
	cards = frappe.parse_json(cards) if isinstance(cards, str) else cards
	if not isinstance(cards, list):
		frappe.throw("Bento cards must be a list")
	if len(cards) > PROFILE_BENTO_MAX_CARDS:
		frappe.throw(f"Profiles can have at most {PROFILE_BENTO_MAX_CARDS} bento cards")

	seen_card_ids = set()
	return [normalize_bento_card(card, seen_card_ids) for card in cards]


def normalize_bento_card(card, seen_card_ids):
	if not isinstance(card, dict):
		frappe.throw("Each bento card must be an object")

	card_id = require_card_value(card.get("id") or card.get("card_id"), "Card ID")
	if not PROFILE_BENTO_CARD_ID_PATTERN.match(card_id):
		frappe.throw("Card ID may only contain letters, numbers, underscores, and hyphens")
	if card_id in seen_card_ids:
		frappe.throw(f"Duplicate bento card ID: {card_id}")
	seen_card_ids.add(card_id)

	card_type = require_allowed_value(card.get("type"), PROFILE_BENTO_CARD_TYPES, "Card type")
	size = require_allowed_value(card.get("size"), PROFILE_BENTO_CARD_SIZES, "Card size")
	image_rendering = optional_allowed_value(
		card.get("imageRendering") or card.get("image_rendering") or "Cover",
		PROFILE_BENTO_IMAGE_RENDERING,
		"Image rendering",
	)
	return {
		"card_id": card_id,
		"type": card_type,
		"size": size,
		"title": truncate(card.get("title"), 140),
		"text": normalize_bento_card_text(card.get("text"), card_type),
		"url": normalize_bento_card_url(card.get("url")),
		"image": normalize_bento_card_image(card.get("image"), card_type),
		"image_rendering": image_rendering,
		"image_position": optional_int_range(
			pick_card_value(card, "imagePosition", "image_position"),
			0,
			100,
			"Image position",
		),
	}


def profile_bento_row_to_card(row):
	card = {
		"id": row.card_id,
		"type": row.type,
		"size": row.size,
		"title": row.title,
		"imageRendering": row.image_rendering or "Cover",
	}
	if row.text:
		card["text"] = row.text
	if row.url:
		card["url"] = row.url
	if row.image:
		card["image"] = row.image
	if row.image_position is not None:
		card["imagePosition"] = row.image_position

	return card


def get_default_profile_bento_cards(profile):
	display_name = profile.full_name or frappe.db.get_value("User", profile.user, "full_name") or profile.user
	cards = get_default_profile_image_cards(profile)
	cards.extend(
		[
			{
				"id": "full-name",
				"type": "Text",
				"size": "1x1",
				"title": "Full name",
				"text": display_name,
			},
			{
				"id": "bio",
				"type": "Text",
				"size": "2x1",
				"title": "Bio",
				"text": profile.bio or "No bio yet.",
			},
		]
	)
	return cards


def get_default_profile_image_cards(profile):
	cards = []
	if profile.cover_image:
		cards.append(
			{
				"id": "cover",
				"type": "Image",
				"size": "4x1",
				"title": "Cover image",
				"image": profile.cover_image,
				"imageRendering": "Cover",
				"imagePosition": profile.cover_image_position
				if profile.cover_image_position is not None
				else 50,
			}
		)
	if profile.image:
		cards.append(
			{
				"id": "avatar",
				"type": "Image",
				"size": "1x1",
				"title": "Avatar",
				"image": profile.image,
				"imageRendering": "Cover",
				"imagePosition": 50,
			}
		)
	return cards


def require_card_value(value, label):
	value = (value or "").strip()
	if not value:
		frappe.throw(f"{label} is required")
	return value


def require_allowed_value(value, allowed_values, label):
	value = require_card_value(value, label)
	if value not in allowed_values:
		frappe.throw(f"Invalid {label.lower()}: {value}")
	return value


def optional_allowed_value(value, allowed_values, label):
	value = (value or "").strip()
	if not value:
		return None
	if value not in allowed_values:
		frappe.throw(f"Invalid {label.lower()}: {value}")
	return value


def normalize_bento_card_text(value, card_type):
	if card_type != "Text":
		return truncate(value, 140)

	text = str(value or "").strip()
	if not text:
		frappe.throw("Text cards must have text")
	return text[:140]


def normalize_bento_card_image(value, card_type):
	if card_type != "Image":
		return truncate(value, 500)

	image = str(value or "").strip()
	if not image:
		frappe.throw("Image cards must have an image")
	return image[:500]


def normalize_bento_card_url(value):
	if value is None:
		return None

	url = str(value).strip()
	if not url:
		return None
	if len(url) > 500:
		frappe.throw("URL must be 500 characters or fewer")
	if PROFILE_BENTO_URL_CONTROL_CHAR_PATTERN.search(url):
		frappe.throw("URL cannot contain spaces or control characters")

	parsed_url = urlparse(url)
	if parsed_url.scheme.lower() not in PROFILE_BENTO_ALLOWED_URL_SCHEMES or not parsed_url.netloc:
		frappe.throw("URL must start with http:// or https://")
	return url


def pick_card_value(card, camel_key, snake_key):
	if camel_key in card:
		return card.get(camel_key)
	return card.get(snake_key)


def optional_int_range(value, min_value, max_value, label):
	if value is None or value == "":
		return None
	try:
		value = int(value)
	except (TypeError, ValueError):
		frappe.throw(f"{label} must be a number")
	return min(max_value, max(min_value, value))


def truncate(value, length):
	if value is None:
		return None
	return str(value)[:length]


@frappe.whitelist()
def get_last_post():
	discussions = frappe.db.get_list(
		"GP Discussion",
		filters={"owner": frappe.session.user},
		fields=["creation"],
		order_by="creation desc",
		limit=1,
		pluck="creation",
	)
	comments = frappe.db.get_list(
		"GP Comment",
		filters={"owner": frappe.session.user},
		fields=["creation"],
		order_by="creation desc",
		limit=1,
		pluck="creation",
	)
	posts = discussions + comments
	if not posts:
		return None
	posts.sort(reverse=True)
	return posts[0]
