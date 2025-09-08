# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Dunder Mifflin demo data generation for Gameplan.
Replaces the existing Techflow demo with character-driven discussions.
"""

import random
from datetime import datetime, timedelta

import frappe

from gameplan.demo.characters.personality_profiles import CHARACTER_PROFILES
from gameplan.demo.generators.discussion_generator import (
	DiscussionGenerator,
	generate_discussions_for_all_spaces,
)
from gameplan.gemoji import get_random_gemoji


def generate_dunder_mifflin_users():
	"""Generate Dunder Mifflin demo users with realistic profiles."""
	created_count = 0

	total_users = len(CHARACTER_PROFILES)
	for i, (email, profile) in enumerate(CHARACTER_PROFILES.items()):
		frappe.utils.update_progress_bar("Creating Dunder Mifflin users", i, total_users, absolute=True)
		if create_dunder_mifflin_user(email, profile):
			created_count += 1

	frappe.utils.update_progress_bar("Creating Dunder Mifflin users", total_users, total_users, absolute=True)
	print()

	frappe.db.commit()
	return created_count


def create_dunder_mifflin_user(email, profile):
	"""Create a User and GP User Profile for a Dunder Mifflin character."""
	try:
		# Check if user already exists
		if frappe.db.exists("User", email):
			return False

		# Create User record
		user_doc = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": profile["name"].split()[0],
				"last_name": profile["name"].split()[-1] if len(profile["name"].split()) > 1 else "",
				"user_image": generate_dunder_mifflin_avatar(profile["name"]),
				"send_welcome_email": 0,
				"user_type": "System User",
				"roles": [{"role": "Gameplan Member"}],
			}
		)

		user_doc.insert(ignore_permissions=True)

		# Create or update GP User Profile
		try:
			profile_doc = frappe.get_doc("GP User Profile", {"user": email})
		except frappe.DoesNotExistError:
			profile_doc = frappe.get_doc(
				{
					"doctype": "GP User Profile",
					"user": email,
					"bio": generate_character_bio(profile),
					"readme": generate_character_readme(profile),
					"image": generate_dunder_mifflin_avatar(profile["name"]),
				}
			)
			profile_doc.insert(ignore_permissions=True)
		else:
			profile_doc.bio = generate_character_bio(profile)
			profile_doc.readme = generate_character_readme(profile)
			profile_doc.image = generate_dunder_mifflin_avatar(profile["name"])
			profile_doc.save(ignore_permissions=True)

		frappe.db.commit()
		return True

	except Exception as e:
		print(f"Error creating user/profile for {email}: {str(e)}")
		frappe.log_error(f"Dunder Mifflin User Creation Error: {str(e)}", "Demo Data Generation")
		return False


def generate_dunder_mifflin_avatar(name):
	"""Generate avatar URL for Dunder Mifflin characters."""
	seed = name.lower().replace(" ", "")
	return f"https://api.dicebear.com/9.x/adventurer/svg?seed={seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"


def generate_character_bio(profile):
	"""Generate bio based on character profile."""
	personality_traits = profile.get("personality_traits", {})
	interests = profile.get("interests", [])

	bio_parts = [
		f"{profile['title']} in {profile['department']}",
	]

	if interests:
		interest_text = ", ".join(interests[:2])
		bio_parts.append(f"Passionate about {interest_text}")

	communication_style = personality_traits.get("communication_style", "")
	if "enthusiastic" in communication_style:
		bio_parts.append("Always excited about new challenges")
	elif "analytical" in communication_style:
		bio_parts.append("Focused on data-driven solutions")
	elif "practical" in communication_style:
		bio_parts.append("Believes in getting things done efficiently")

	return ". ".join(bio_parts) + "."


def generate_character_readme(profile):
	"""Generate detailed readme content for character."""
	name = profile["name"].split()[0]  # First name
	title = profile["title"]
	department = profile["department"]
	interests = profile.get("interests", [])
	catchphrases = profile.get("catchphrases", [])

	readme_content = f"""<h3>About {name}</h3>
<p>I'm {name}, working as a {title} in the {department} team at Dunder Mifflin Scranton.</p>

<h4>🎯 What I Focus On</h4>
<ul>"""

	# Add interests as focus areas
	for interest in interests[:3]:
		readme_content += f"<li>{interest.title()}</li>"

	readme_content += """</ul>

<h4>💼 My Approach</h4>"""

	# Add personality-specific approach
	personality_traits = profile.get("personality_traits", {})
	communication_style = personality_traits.get("communication_style", "")

	if "enthusiastic" in communication_style:
		readme_content += "<p>I bring energy and enthusiasm to everything I do. I believe in motivating the team and creating a positive work environment.</p>"
	elif "analytical" in communication_style:
		readme_content += "<p>I approach problems systematically and rely on data to make informed decisions. Accuracy and precision are my top priorities.</p>"
	elif "direct" in communication_style:
		readme_content += "<p>I believe in straightforward communication and efficient processes. No time for unnecessary complications.</p>"
	elif "diplomatic" in communication_style:
		readme_content += "<p>I focus on building relationships and finding solutions that work for everyone. Collaboration is key to success.</p>"
	else:
		readme_content += "<p>I'm committed to doing quality work and contributing to our team's success at Dunder Mifflin.</p>"

	# Add a favorite catchphrase if available
	if catchphrases:
		favorite_phrase = random.choice(catchphrases)
		readme_content += f"""

<h4>📝 Philosophy</h4>
<p><em>"{favorite_phrase}"</em></p>"""

	readme_content += """

<h4>🤝 Let's Collaborate</h4>
<p>Always happy to help out with projects and share knowledge. Feel free to reach out!</p>"""

	return readme_content


def generate_dunder_mifflin_teams_and_projects():
	"""Generate teams and projects for Dunder Mifflin."""
	# Define teams based on the company structure
	teams_data = [
		{"title": "Executive Management"},
		{"title": "Sales Department"},
		{"title": "Accounting Department"},
		{"title": "Human Resources"},
		{"title": "Customer Service"},
		{"title": "Warehouse Operations"},
		{"title": "Quality Assurance"},
		{"title": "Supply Chain & Procurement"},
		{"title": "Security"},
	]

	# Define spaces by department (from our structure document)
	spaces_by_department = {
		"Sales Department": [
			"Sales Targets",
			"Client Retention",
			"Territory Management",
			"Sales Training",
			"CRM & Tools",
			"Lead Generation",
			"Customer Relationships",
		],
		"Accounting Department": [
			"Financial Audits",
			"Expense Management",
			"Budget Planning",
			"Tax Compliance",
			"Accounts Receivable",
		],
		"Human Resources": [
			"Employee Handbook",
			"Diversity & Inclusion",
			"Performance Reviews",
			"Workplace Culture",
			"Remote Work Policies",
			"Benefits & Compensation",
		],
		"Customer Service": [
			"Customer Satisfaction",
			"Support Systems",
			"Customer Onboarding",
			"Service Quality",
		],
		"Warehouse Operations": [
			"Inventory Management",
			"Shipping & Receiving",
			"Safety Protocols",
			"Warehouse Organization",
			"Supplier Coordination",
			"Equipment & Maintenance",
		],
		"Quality Assurance": ["Product Quality Standards", "Process Improvement", "Compliance & Audits"],
		"Executive Management": [
			"Company Strategy",
			"Performance Reviews",
			"Budget Planning",
			"Team Leadership",
		],
		"Supply Chain & Procurement": [
			"Vendor Management",
			"Procurement Process",
			"Supply Chain Optimization",
		],
		"Security": ["Building Security", "Safety Protocols", "Access Control"],
	}

	created_teams = []
	created_projects = []

	# Create teams
	for i, team_data in enumerate(teams_data):
		frappe.utils.update_progress_bar("Creating Teams", i, len(teams_data), absolute=True)
		team = create_team(team_data)
		if team:
			created_teams.append(team)
	frappe.utils.update_progress_bar("Creating Teams", len(teams_data), len(teams_data), absolute=True)
	print()

	# Create projects (spaces) for each team
	projects_to_create = []
	for team in created_teams:
		team_spaces = spaces_by_department.get(team.title, [])
		for space_name in team_spaces:
			projects_to_create.append(
				{
					"title": space_name,
					"team": team.name,
					"icon": get_random_gemoji().emoji,
					"is_private": 0,  # Keep all spaces public for demo
				}
			)

	for i, project_data in enumerate(projects_to_create):
		frappe.utils.update_progress_bar("Creating Spaces", i, len(projects_to_create), absolute=True)
		project = create_project(project_data)
		if project:
			created_projects.append(project)

	frappe.utils.update_progress_bar(
		"Creating Spaces", len(projects_to_create), len(projects_to_create), absolute=True
	)
	print()

	# Assign users to projects based on department
	assign_dunder_mifflin_users_to_projects(created_projects)

	frappe.db.commit()
	return created_teams, created_projects


def create_team(team_data):
	"""Create a GP Team record."""
	try:
		if frappe.db.exists("GP Team", {"title": team_data["title"]}):
			return frappe.get_doc("GP Team", {"title": team_data["title"]})

		team_doc = frappe.new_doc("GP Team")
		team_doc.title = team_data["title"]
		team_doc.insert()
		return team_doc
	except Exception as e:
		print(f"Error creating team {team_data['title']}: {str(e)}")
		return None


def create_project(project_data):
	"""Create a GP Project record."""
	try:
		project_exists = frappe.db.exists(
			"GP Project", {"title": project_data["title"], "team": project_data["team"]}
		)
		if project_exists:
			return frappe.get_doc("GP Project", project_exists)

		project_doc = frappe.new_doc("GP Project")
		project_doc.title = project_data["title"]
		project_doc.team = project_data["team"]
		project_doc.icon = project_data["icon"]
		project_doc.is_private = project_data["is_private"]
		project_doc.insert()
		return project_doc
	except Exception as e:
		print(f"Error creating project {project_data['title']}: {str(e)}")
		return None


def assign_dunder_mifflin_users_to_projects(projects):
	"""Assign Dunder Mifflin users to appropriate projects."""
	# Get department mapping
	department_mapping = {}
	for email, profile in CHARACTER_PROFILES.items():
		dept = profile["department"]
		if dept not in department_mapping:
			department_mapping[dept] = []
		department_mapping[dept].append(email)

	for project in projects:
		team_title = frappe.get_value("GP Team", project.team, "title")

		# Add users from the same department
		dept_users = department_mapping.get(team_title, [])
		for user_email in dept_users:
			project.append("members", {"user": user_email})

		# Add some cross-department collaboration
		if team_title == "Sales Department":
			# Sales works with Customer Service and Warehouse
			dept_users.extend(department_mapping.get("Customer Service", []))
			dept_users.extend(
				department_mapping.get("Warehouse Operations", [])[:2]
			)  # Only 2 warehouse users
		elif team_title == "Accounting Department":
			# Accounting works with Executive Management
			dept_users.extend(department_mapping.get("Executive Management", []))
		elif team_title == "Human Resources":
			# HR works with everyone, add a few from each department
			for dept, users in department_mapping.items():
				if dept != "Human Resources":
					dept_users.extend(users[:1])  # Add 1 person from each department

		# Remove duplicates and save
		added_users = set()
		project.members = []
		for user_email in dept_users:
			if user_email not in added_users:
				project.append("members", {"user": user_email})
				added_users.add(user_email)

		project.save()


def generate_dunder_mifflin_discussions_and_comments():
	"""Generate realistic discussions and comments for all spaces with mixed authorship."""
	print("Generating discussions with realistic comments and mixed authorship...")

	# Get all projects (spaces) organized by department
	projects = frappe.get_all("GP Project", fields=["name", "title", "team"], order_by="team")

	# Get all department members for random author selection
	all_members = frappe.get_all("GP User Profile", fields=["email", "full_name", "department"])

	spaces_by_department = {}
	for project in projects:
		team_title = frappe.get_value("GP Team", project.team, "title")
		if team_title not in spaces_by_department:
			spaces_by_department[team_title] = []
		spaces_by_department[team_title].append(project.title)

	# Generate discussions with mixed authorship
	total_discussions = 0
	generator = DiscussionGenerator()

	all_projects = [(p.title, frappe.get_value("GP Team", p.team, "title")) for p in projects]

	for i, (space_name, department) in enumerate(all_projects):
		frappe.utils.update_progress_bar("Generating discussions", i, len(all_projects), absolute=True)

		num_discussions = random.randint(3, 7)
		for _ in range(num_discussions):
			# Choose random author from ANY department (not just the space's department)
			random_author = random.choice(all_members)

			# Generate discussion with this random author
			discussion_data = generator.generate_discussion(space_name, department, random_author.email)
			if discussion_data:
				create_discussion_and_comments(discussion_data, space_name)
				total_discussions += 1

	frappe.utils.update_progress_bar(
		"Generating discussions", len(all_projects), len(all_projects), absolute=True
	)
	print()

	frappe.db.commit()
	print(f"Generated {total_discussions} discussions with realistic comments and mixed authorship!")


def create_discussion_and_comments(discussion_data, space_name):
	"""Create a GP Discussion with comments."""
	try:
		# Get project (space) ID
		project = frappe.get_value("GP Project", {"title": space_name}, "name")
		if not project:
			return

		# Set user context to the actual author
		original_user = frappe.session.user
		frappe.set_user(discussion_data["author"])

		try:
			# Create discussion
			discussion_doc = frappe.new_doc("GP Discussion")
			discussion_doc.title = discussion_data["title"]
			discussion_doc.content = discussion_data["content"]
			discussion_doc.project = project
			discussion_doc.creation = discussion_data["created_at"]
			discussion_doc.modified = discussion_data["created_at"]
			discussion_doc.insert(ignore_permissions=True)

			# Create comments
			for comment_data in discussion_data.get("comments", []):
				# Set user context for each comment author
				frappe.set_user(comment_data["author"])
				comment_doc = frappe.new_doc("GP Comment")
				comment_doc.content = comment_data["content"]
				comment_doc.discussion = discussion_doc.name
				comment_doc.creation = comment_data["created_at"]
				comment_doc.modified = comment_data["created_at"]
				comment_doc.insert(ignore_permissions=True)
		finally:
			# Always restore original user
			frappe.set_user(original_user)

	except Exception as e:
		print(f"Error creating discussion '{discussion_data['title']}': {str(e)}")


# Main functions to integrate with existing demo system
def generate_dunder_mifflin_demo():
	"""Generate complete Dunder Mifflin demo data."""
	frappe.conf.disable_gameplan_search = True

	print("🏢 Generating Dunder Mifflin demo data for Gameplan...")

	print("👥 Creating Dunder Mifflin employees...")
	generate_dunder_mifflin_users()

	print("🏗️ Setting up departments and spaces...")
	generate_dunder_mifflin_teams_and_projects()

	print("💬 Generating realistic discussions and comments...")
	generate_dunder_mifflin_discussions_and_comments()

	print("\n🎉 Dunder Mifflin demo data generation completed!")
	print("Welcome to Dunder Mifflin Scranton — The Electric City! ⚡")


def clear_dunder_mifflin_demo():
	"""Clear all Dunder Mifflin demo data comprehensively."""
	print("🧹 Clearing Dunder Mifflin demo data...")

	gameplan_doctypes = [
		# Child/dependent tables first
		"GP Reaction",
		"GP Member",
		"GP Activity",
		"GP Poll Vote",
		"GP Poll Option",
		"GP Comment",
		"GP Discussion Visit",
		"GP Project Visit",
		"GP Pinned Project",
		"GP Followed Project",
		"GP Bookmark",
		"GP Guest Access",
		"GP Invitation",
		"GP Draft",
		"GP Notification",
		# Main content tables
		"GP Discussion",
		"GP Task",
		"GP Page",
		"GP Poll",
		# Project and team tables (parent tables last)
		"GP Project",
		"GP Team",
		# User profile table
		"GP User Profile",
	]

	total_deleted = 0

	# Delete from each doctype table directly
	print("Clearing Gameplan tables...")
	for doctype in gameplan_doctypes:
		try:
			table_name = f"tab{doctype}"

			# Get count before deletion for reporting
			count_result = frappe.db.sql(f"SELECT COUNT(*) FROM `{table_name}`")
			count = count_result[0][0] if count_result else 0

			if count > 0:
				# Delete all records from the table
				frappe.db.sql(f"DELETE FROM `{table_name}`")
				print(f"Deleted {count} from {doctype}")
				total_deleted += count

		except Exception as e:
			print(f"Error in {doctype}: {str(e)}")
			# Continue with other tables even if one fails
			continue

	# Delete Dunder Mifflin users
	try:
		dunder_mifflin_users = list(CHARACTER_PROFILES.keys())
		user_count = 0

		print("Deleting Dunder Mifflin users...")
		for email in dunder_mifflin_users:
			if frappe.db.exists("User", email):
				frappe.delete_doc("User", email, ignore_permissions=True)
				user_count += 1

		if user_count > 0:
			print(f"Deleted {user_count} Dunder Mifflin users")
			total_deleted += user_count
		else:
			print("No Dunder Mifflin users found to delete")

	except Exception as e:
		print(f"❌ Error deleting Dunder Mifflin users: {str(e)}")

	# Clear any related single doctype settings if needed
	print("\n🔄 Resetting sequences...")
	sequences_to_reset = ["GP Discussion", "GP Comment", "GP Project", "GP Task", "GP Team"]

	for doctype in sequences_to_reset:
		sequence_name = frappe.scrub(doctype + "_id_seq")
		try:
			frappe.db.sql(f"ALTER SEQUENCE `{sequence_name}` RESTART WITH 1")
			print(f"Reset {sequence_name}")
		except Exception:
			print(f"Skipped {sequence_name}")
			# Sequence might not exist, continue
			pass

	# Commit the transaction
	frappe.db.commit()

	print("\n✅ Dunder Mifflin demo data cleanup completed!")
	print(f"📊 Total records deleted: {total_deleted}")


def clear_and_regenerate_dunder_mifflin_demo():
	"""Clear existing data and regenerate fresh Dunder Mifflin demo."""
	clear_dunder_mifflin_demo()
	print("\n" + "=" * 50)
	generate_dunder_mifflin_demo()
