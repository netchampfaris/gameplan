import frappe


def execute():
	profile = frappe.db.get_value("GP User Profile", {"user": "chloe@moonhollow.studio"}, "name")
	frappe.db.set_value(
		"GP User Profile",
		profile,
		"bio",
		"A product designer who loves to learn and talk about type, colour and psychology. I believe in "
		"shipping, but sustainably. Outside work I sing, organise community events and read too many "
		"books. Currently designing the Moonhollow onboarding flow.",
	)
	frappe.db.commit()


def render_digest(user=None, out=None):
	from frappe.email.email_body import get_formatted_html

	from gameplan.email_digest import build_digest, get_digest_email_context

	rows = frappe.db.sql(
		"select to_user, count(*) c from `tabGP Notification` where `read`=0 group by to_user order by c desc",
		as_dict=True,
	)
	if not user:
		for row in rows:
			digest = build_digest(row.to_user)
			if digest["notifications"] and digest["discussions"]:
				user = row.to_user
				break
	profile = frappe.get_doc("GP User Profile", {"user": user})
	profile.email_digest_frequency = "Weekly"
	digest = build_digest(user)
	body = frappe.render_template(
		"templates/emails/email_digest.html", get_digest_email_context(profile, digest)
	)
	html = get_formatted_html("digest", body, header=None, sender=None)
	with open(out or "/tmp/digest.html", "w") as f:
		f.write(html)
	print(user, len(digest["notifications"]), len(digest["discussions"]))


def seed_rail():
	from gameplan.ui_test_helpers import SECOND_MEMBER, _create_community, _create_discussion, _general_space

	names = [
		"Studio",
		"Design",
		"Engineering",
		"Support",
		"Marketing",
		"Sales",
		"Ops",
		"Finance",
		"People",
		"Research",
		"Events",
		"Library",
	]
	for i, title in enumerate(names):
		community = _create_community(title)
		space = _general_space(community)
		for j in range([3, 12, 1, 120, 5, 2, 8, 4, 9, 1, 15, 6][i]):
			_create_discussion(f"{title} thread {j}", space, owner=SECOND_MEMBER)
	frappe.db.commit()
