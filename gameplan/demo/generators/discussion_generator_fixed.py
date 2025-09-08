import random
from datetime import datetime, timedelta

import frappe

from gameplan.demo.content.discussion_templates import (
	get_random_comment_template,
	get_random_discussion_template,
	get_template_variables,
)
from gameplan.demo.content.personality_profiles import get_character_profile
from gameplan.demo.content.relationship_matrix import (
	get_likely_participants,
	get_relationship_dynamic,
	should_comment,
)


class DiscussionGenerator:
	"""Generate realistic discussions and comments with character personalities."""

	def __init__(self):
		"""Initialize the discussion generator with space-specific topics."""
		self.space_topics = {
			"Sales Pipeline": [
				"quarterly targets",
				"lead qualification",
				"client meetings",
				"proposal deadlines",
			],
			"Client Meetings": [
				"client presentations",
				"meeting preparation",
				"follow-up actions",
				"client feedback",
			],
			"Training Programs": [
				"skill development",
				"new employee orientation",
				"certification programs",
				"workshop planning",
			],
			"Vendor Management": [
				"supplier negotiations",
				"contract renewals",
				"quality assessments",
				"cost optimization",
			],
			"Office Management": [
				"facility maintenance",
				"supply ordering",
				"space planning",
				"equipment updates",
			],
			"Warehouse Operations": [
				"inventory management",
				"shipping schedules",
				"safety procedures",
				"efficiency improvements",
			],
			"Quality Control": [
				"product inspection",
				"quality standards",
				"process improvements",
				"compliance checks",
			],
			"Safety Protocols": [
				"safety training",
				"incident reporting",
				"equipment maintenance",
				"emergency procedures",
			],
			"Employee Recognition": [
				"performance awards",
				"team achievements",
				"celebration planning",
				"appreciation events",
			],
			"Technology Updates": [
				"software upgrades",
				"system maintenance",
				"user training",
				"technical support",
			],
			"Budget Planning": [
				"expense tracking",
				"budget allocation",
				"cost analysis",
				"financial reporting",
			],
			"Customer Satisfaction": [
				"feedback analysis",
				"service improvements",
				"complaint resolution",
				"satisfaction surveys",
			],
			"Process Documentation": [
				"procedure updates",
				"workflow documentation",
				"standard operating procedures",
				"best practices",
			],
			"Communication Systems": [
				"information sharing",
				"meeting protocols",
				"reporting structures",
				"feedback mechanisms",
			],
		}

	def generate_discussion(self, space_name, space_department):
		"""Generate a complete discussion with comments for a space."""
		# Choose an author from the department
		department_members = frappe.get_all(
			"GP User Profile", filters={"department": space_department}, fields=["email", "full_name"]
		)

		if not department_members:
			return None

		# Select random author from department
		author_data = random.choice(department_members)
		author_email = author_data.email
		author_profile = get_character_profile(author_email)

		if not author_profile:
			return None

		# Choose discussion type based on personality
		discussion_type = self._choose_discussion_type(author_profile, space_name)

		# Get template and fill it
		template = get_random_discussion_template(discussion_type)
		if not template:
			return None

		# Generate variables for template
		variables = self._generate_template_variables(discussion_type, space_name, author_profile)

		# Fill template completely
		filled_discussion = self._fill_template_completely(template, variables)

		# Apply personality to content
		final_content = self._apply_personality_to_content(filled_discussion["content"], author_profile)

		# Generate comments
		comments = self._generate_comments(final_content, space_name, space_department, author_email)

		return {
			"title": filled_discussion["title"],
			"content": final_content,
			"author": author_email,
			"created_at": self._generate_timestamp(),
			"comments": comments,
		}

	def _choose_discussion_type(self, author_profile, space_name):
		"""Choose discussion type based on author personality and space."""
		weighted_types = [
			"status_update",
			"problem_solving",
			"announcement",
			"brainstorming",
			"question_help",
		]

		personality_traits = author_profile.get("personality_traits", {})

		# Map personality traits to preferred discussion types
		personality_preferences = {
			"status_update": ["professional", "data_driven", "organized"],
			"problem_solving": ["collaborative", "analytical", "practical"],
			"announcement": ["authoritative", "formal", "leadership"],
			"brainstorming": ["creative", "collaborative", "innovative"],
			"question_help": ["humble", "learning", "collaborative"],
			"social_fun": ["social", "enthusiastic", "casual"],
			"complaint_concern": ["detail_oriented", "quality_focused", "direct"],
		}

		# Weight discussion types based on author's personality
		weighted_types = []
		communication_style = personality_traits.get("communication_style", "")
		confidence = personality_traits.get("confidence", "")

		for disc_type, preferred_traits in personality_preferences.items():
			weight = 1
			for trait in preferred_traits:
				if trait in communication_style or trait in confidence:
					weight += 2
			weighted_types.extend([disc_type] * weight)

		# Add space-specific biases
		space_biases = {
			"Sales Pipeline": ["status_update", "problem_solving"],
			"Client Meetings": ["announcement", "status_update"],
			"Training Programs": ["announcement", "brainstorming"],
			"Vendor Management": ["problem_solving", "announcement"],
			"Office Management": ["status_update", "problem_solving"],
			"Warehouse Operations": ["status_update", "problem_solving"],
			"Quality Control": ["problem_solving", "complaint_concern"],
			"Safety Protocols": ["announcement", "complaint_concern"],
			"Employee Recognition": ["social_fun", "announcement"],
			"Technology Updates": ["announcement", "problem_solving"],
			"Budget Planning": ["status_update", "problem_solving"],
			"Customer Satisfaction": ["problem_solving", "status_update"],
			"Safety Protocols": ["announcement", "complaint_concern"],
		}

		if space_name in space_biases:
			weighted_types.extend(space_biases[space_name] * 3)

		return random.choice(weighted_types)

	def _generate_template_variables(self, discussion_type, space_name, author_profile):
		"""Generate variables to fill templates based on space and personality."""
		base_variables = get_template_variables(discussion_type)
		generated_variables = {}

		# Generate space-specific topics
		space_topics = self.space_topics.get(space_name, ["general topics"])

		for var_name, var_options in base_variables.items():
			if var_name == "topic":
				# Use space-specific topics
				generated_variables[var_name] = random.choice(space_topics)
			elif var_name == "space_name":
				generated_variables[var_name] = space_name
			elif isinstance(var_options, list):
				generated_variables[var_name] = random.choice(var_options)
			else:
				generated_variables[var_name] = var_options

		# Add comprehensive common variables that might be missing from templates
		common_variables = {
			"details": "More information will be shared as it becomes available.",
			"context": "This has been on my mind lately and I wanted to get everyone's input.",
			"background": "Here's some background context for this discussion.",
			"current_thinking": "Here's where my thinking is at right now.",
			"specific_focus": "I'd especially like to focus on how this impacts our daily workflow.",
			"brief_status": "Everything is moving along well.",
			"next_steps": "Let me know your thoughts on how we should proceed.",
			"main_announcement": "We're implementing some changes that will improve our processes.",
			"key_points": "The main things to keep in mind are efficiency and communication.",
			"brief_description": "This is an important update for everyone to be aware of.",
			"brainstorm_ask": "I'd love to get your creative ideas on this.",
			"specific_question": "How should we handle this going forward?",
			"background_info": "This relates to our ongoing efforts to improve processes.",
			"help_description": "understanding the best approach for this situation",
			"event_announcement": "I'm excited to announce we're planning something fun!",
			"event_details": "Details are still being worked out, but it should be great.",
			"participation_ask": "Let me know if you're interested in participating!",
			"fun_content": "Just wanted to share something interesting with everyone.",
			"engagement_question": "What do you all think?",
			"main_concern": "I think this could affect our productivity.",
			"impact_description": "If we don't address this, it could cause delays.",
			"proposed_solution": "Here's what I think we should do about it.",
			"direct_opener": "We need to talk about this issue.",
			"issue_description": "There's a problem that needs our attention.",
			"impact": "This is affecting our work quality.",
			"closing": "Thanks for your attention to this matter.",
			"additional_context": "I thought this context might be helpful.",
			"question_context": "I'm trying to understand",
			"main_question": "What's the best way to handle this?",
			"urgency_opener": "This needs immediate attention.",
			"problem_details": "It's affecting our delivery timeline and client satisfaction.",
			"effective_date": "This will take effect starting next week.",
			"announcement_opener": "I wanted to share some important news with everyone.",
			"topic": random.choice(space_topics),
			"space_name": space_name,
			"author": author_profile.get("name", "").split()[0]
			if author_profile.get("name")
			else "Team Member",
		}

		# Merge generated variables with common fallbacks
		for var_name, fallback_value in common_variables.items():
			if var_name not in generated_variables:
				generated_variables[var_name] = fallback_value

		return generated_variables

	def _fill_template_completely(self, template, variables):
		"""Fill template ensuring ALL placeholders are replaced."""
		import re

		title = template["title"]
		content = template["content"]

		# Replace all variables in title and content
		for var_name, var_value in variables.items():
			if isinstance(var_value, list):
				var_value = random.choice(var_value)

			placeholder = "{" + var_name + "}"
			title = title.replace(placeholder, str(var_value))
			content = content.replace(placeholder, str(var_value))

		# Find any remaining unreplaced placeholders and provide fallbacks
		remaining_placeholders_title = re.findall(r"\{([^}]+)\}", title)
		remaining_placeholders_content = re.findall(r"\{([^}]+)\}", content)

		all_remaining = set(remaining_placeholders_title + remaining_placeholders_content)

		# Generate fallback values for any missed placeholders
		fallback_values = {
			"announcement_type": "Policy",
			"effective_date": "starting next week",
			"problem_type": "Process",
			"urgency_level": "Important",
			"topic": "workflow improvement",
			"space_name": variables.get("space_name", "General"),
			"author": variables.get("author", "Team Member"),
			"details": "More details to follow.",
			"main_announcement": "We're making some improvements.",
			"closing": "Thanks for your attention.",
			"context": "This is important for our team.",
			"specific_ask": "Let me know your thoughts.",
			"problem_description": "an issue that needs attention",
			"impact": "our workflow efficiency",
		}

		# Apply fallbacks to any remaining placeholders
		for placeholder in all_remaining:
			fallback_value = fallback_values.get(placeholder, f"[{placeholder}]")
			title = title.replace("{" + placeholder + "}", fallback_value)
			content = content.replace("{" + placeholder + "}", fallback_value)

		return {"title": title, "content": content}

	def _apply_personality_to_content(self, content, author_profile):
		"""Apply author's personality traits to the discussion content."""
		personality_traits = author_profile.get("personality_traits", {})
		catchphrases = author_profile.get("catchphrases", [])

		# Apply formality level
		formality = personality_traits.get("formality_level", "casual")
		if formality == "very_casual":
			content = self._make_content_casual(content)
		elif formality == "formal":
			content = self._make_content_formal(content)

		# Add personality-specific phrases
		communication_style = personality_traits.get("communication_style", "")
		if "enthusiastic" in communication_style and random.random() < 0.3:
			content += " I'm really excited about this!"

		# Add catchphrases occasionally
		if catchphrases and random.random() < 0.15:
			catchphrase = random.choice(catchphrases)
			content += f" {catchphrase}"

		return content

	def _make_content_casual(self, content):
		"""Make content more casual."""
		casual_replacements = {
			"We need to": "We should probably",
			"It is important": "It's pretty important",
			"Please ensure": "Make sure",
			"I recommend": "I think we should",
			"Therefore": "So",
		}

		for formal, casual in casual_replacements.items():
			content = content.replace(formal, casual)

		return content

	def _make_content_formal(self, content):
		"""Make content more formal."""
		formal_replacements = {
			"We should probably": "We need to",
			"It's pretty important": "It is important",
			"Make sure": "Please ensure",
			"I think we should": "I recommend",
			"So": "Therefore",
		}

		for casual, formal in formal_replacements.items():
			content = content.replace(casual, formal)

		return content

	def _apply_personality_uncertainty(self, content, author_profile):
		"""Add uncertainty phrases based on personality."""
		personality_traits = author_profile.get("personality_traits", {})
		confidence = personality_traits.get("confidence", "")

		if "hesitant" in confidence or "self_doubting" in confidence:
			uncertain_phrases = ["I think", "Maybe", "It seems like", "I believe", "Perhaps"]
		else:
			uncertain_phrases = ["I believe", "It appears"]

		# Replace some definitive statements with uncertain ones
		for phrase in uncertain_phrases:
			if random.random() < 0.3:
				content = content.replace("This is", f"{phrase} this is")
				content = content.replace("We should", f"{phrase} we should")
				break

		return content

	def _generate_comments(self, discussion_content, space_name, space_department, author_email):
		"""Generate realistic comments for a discussion."""
		comments = []

		# Get likely participants
		participants = get_likely_participants(space_name, space_department, max_participants=6)

		# Remove the original author from potential commenters
		potential_commenters = [p for p in participants if p != author_email]

		# Handle case where there are no potential commenters
		if not potential_commenters:
			return []

		# Generate 2-6 comments based on available commenters
		max_comments = min(6, len(potential_commenters))
		num_comments = random.randint(2, max_comments)

		selected_commenters = random.sample(potential_commenters, num_comments)

		base_timestamp = self._generate_timestamp()

		for i, commenter_email in enumerate(selected_commenters):
			if should_comment(commenter_email, author_email):
				comment = self._generate_single_comment(
					discussion_content, commenter_email, author_email, space_name
				)
				if comment:
					# Add timestamp (comments come after the original post)
					comment["created_at"] = base_timestamp + timedelta(
						minutes=random.randint(10, 180 * (i + 1))
					)
					comments.append(comment)

		return sorted(comments, key=lambda x: x["created_at"])

	def _generate_single_comment(self, discussion_content, commenter_email, author_email, space_name):
		"""Generate a single comment from a specific character."""
		commenter_profile = get_character_profile(commenter_email)
		if not commenter_profile:
			return None

		# Determine comment type based on relationship and personality
		relationship_dynamic = get_relationship_dynamic(commenter_email, author_email)
		comment_type = self._choose_comment_type(relationship_dynamic, commenter_profile)

		# Generate base comment content
		comment_template = get_random_comment_template(comment_type)
		if not comment_template:
			return None

		# Fill template with context-specific content
		comment_content = self._fill_comment_template(
			comment_template, discussion_content, commenter_profile, space_name
		)

		# Apply personality to comment
		final_comment = self._apply_personality_to_comment(
			comment_content, commenter_profile, relationship_dynamic
		)

		return {
			"content": final_comment,
			"author": commenter_email,
			"reply_to": None,  # For now, all comments are top-level
		}

	def _choose_comment_type(self, relationship_dynamic, commenter_profile):
		"""Choose comment type based on relationship and personality."""
		personality_traits = commenter_profile.get("personality_traits", {})

		# Map relationship dynamics to comment type preferences
		dynamic_preferences = {
			"friendly_boss": ["support", "agreement"],
			"devoted_assistant": ["agreement", "support"],
			"intellectual_competition": ["question", "suggestion"],
			"mutual_respect": ["agreement", "suggestion"],
			"frustrated_coworker": ["concern", "question"],
			"casual_friends": ["agreement", "support"],
			"neutral": ["agreement", "question"],
		}

		preferred_types = dynamic_preferences.get(relationship_dynamic, ["agreement", "question"])

		# Add personality-based preferences
		communication_style = personality_traits.get("communication_style", "")
		if "analytical" in communication_style:
			preferred_types.extend(["question", "suggestion"])
		if "supportive" in communication_style:
			preferred_types.extend(["support", "agreement"])
		if "critical" in communication_style:
			preferred_types.extend(["concern", "question"])

		return random.choice(preferred_types)

	def _fill_comment_template(self, template, discussion_content, commenter_profile, space_name):
		"""Fill comment template with relevant content."""
		# Extract key elements from discussion
		discussion_title = (
			discussion_content["title"] if isinstance(discussion_content, dict) else "the discussion"
		)
		discussion_text = (
			discussion_content["content"] if isinstance(discussion_content, dict) else discussion_content
		)

		# Generate context-appropriate content for template placeholders
		replacements = {
			"{author}": commenter_profile.get("name", "").split()[0],  # First name
			"{question}": "how this affects our timeline?",
			"{clarification_point}": "the next steps",
			"{consideration}": "the budget impact",
			"{alternative}": "a different approach",
			"{suggestion}": "we break this into smaller tasks",
			"{recommendation}": "getting input from the warehouse team",
			"{offer_area}": "data analysis",
			"{task}": "this initiative",
			"{expertise_area}": "process optimization",
			"{help_area}": "coordinating with other departments",
			"{support_area}": "implementation",
			"{concern}": "the timeline being too aggressive",
			"{consideration}": "resource allocation",
			"{caution_area}": "rushing the implementation",
			"{problem_area}": "communication between teams",
			"{impact_area}": "customer satisfaction",
		}

		# Fill template
		filled_template = template
		for placeholder, replacement in replacements.items():
			filled_template = filled_template.replace(placeholder, replacement)

		return filled_template

	def _apply_personality_to_comment(self, comment_content, commenter_profile, relationship_dynamic):
		"""Apply character personality to comment content."""
		personality_traits = commenter_profile.get("personality_traits", {})
		typical_responses = commenter_profile.get("typical_responses", [])
		catchphrases = commenter_profile.get("catchphrases", [])

		# Start with base comment
		final_comment = comment_content

		# Add character-specific response patterns
		if typical_responses and random.random() < 0.4:
			response_intro = random.choice(typical_responses)
			final_comment = f"{response_intro} {final_comment}"

		# Apply formality level
		formality = personality_traits.get("formality_level", "casual")
		if formality == "very_casual":
			final_comment = self._make_comment_casual(final_comment)
		elif formality == "formal":
			final_comment = self._make_comment_formal(final_comment)

		# Add catchphrases occasionally
		if catchphrases and random.random() < 0.2:
			catchphrase = random.choice(catchphrases)
			final_comment += f" {catchphrase}"

		# Apply relationship-specific modifications
		if relationship_dynamic == "devoted_assistant":
			final_comment += " MICHAEL!" if random.random() < 0.3 else ""
		elif relationship_dynamic == "intellectual_competition":
			if random.random() < 0.4:
				final_comment = f"Actually, {final_comment.lower()}"

		return final_comment

	def _make_comment_casual(self, comment):
		"""Make comment more casual."""
		casual_replacements = {
			"I believe": "I think",
			"excellent": "great",
			"certainly": "definitely",
			"regarding": "about",
			"however": "but",
		}

		for formal, casual in casual_replacements.items():
			comment = comment.replace(formal, casual)

		return comment

	def _make_comment_formal(self, comment):
		"""Make comment more formal."""
		formal_replacements = {
			"I think": "I believe",
			"great": "excellent",
			"definitely": "certainly",
			"about": "regarding",
			"but": "however",
		}

		for casual, formal in formal_replacements.items():
			comment = comment.replace(casual, formal)

		return comment

	def _generate_timestamp(self):
		"""Generate a realistic timestamp within the last 30 days."""
		days_ago = random.randint(1, 30)
		hours_ago = random.randint(0, 23)
		minutes_ago = random.randint(0, 59)

		return datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
