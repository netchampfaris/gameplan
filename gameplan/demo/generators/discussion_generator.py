# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Content generators that combine personality profiles, templates, and relationships
to create realistic discussions and comments for Dunder Mifflin characters.
"""

import random
import re
from datetime import datetime, timedelta

from ..characters.personality_profiles import get_character_profile, get_characters_by_department
from ..characters.relationship_matrix import get_likely_participants, get_relationship_dynamic, should_comment
from ..content.discussion_templates import (
	DISCUSSION_TEMPLATES,
	fill_template,
	get_random_comment_template,
	get_random_template,
	get_template_variables,
)


class DiscussionGenerator:
	"""Generates realistic discussions based on character personalities and relationships."""

	def __init__(self):
		self.discussion_types = list(DISCUSSION_TEMPLATES.keys())
		self.space_topics = {
			# Sales Department
			"Sales Targets": [
				"monthly goals",
				"quarterly performance",
				"target achievement",
				"sales metrics",
			],
			"Client Retention": [
				"customer satisfaction",
				"renewal rates",
				"relationship building",
				"account management",
			],
			"Territory Management": ["territory assignments", "coverage optimization", "market analysis"],
			"Sales Training": ["skill development", "product knowledge", "sales techniques", "onboarding"],
			"CRM & Tools": ["system updates", "data management", "process optimization", "tool training"],
			"Lead Generation": [
				"prospecting strategies",
				"marketing qualified leads",
				"pipeline development",
			],
			"Customer Relationships": [
				"client feedback",
				"relationship management",
				"communication strategies",
			],
			# Accounting Department
			"Financial Audits": [
				"audit preparation",
				"compliance checks",
				"documentation review",
				"external auditors",
			],
			"Expense Management": ["expense reports", "reimbursements", "budget tracking", "cost control"],
			"Budget Planning": ["annual budgets", "forecasting", "resource allocation", "financial planning"],
			"Tax Compliance": [
				"tax filings",
				"regulatory requirements",
				"deadline management",
				"compliance updates",
			],
			"Accounts Receivable": [
				"payment collections",
				"invoice management",
				"customer payments",
				"aging reports",
			],
			# Human Resources
			"Employee Handbook": ["policy updates", "procedure changes", "guidelines", "compliance"],
			"Diversity & Inclusion": [
				"workplace culture",
				"inclusive practices",
				"training programs",
				"awareness",
			],
			"Performance Reviews": [
				"evaluation process",
				"feedback sessions",
				"goal setting",
				"development plans",
			],
			"Workplace Culture": [
				"team building",
				"office environment",
				"employee engagement",
				"culture initiatives",
			],
			"Remote Work Policies": [
				"work from home",
				"flexible schedules",
				"remote collaboration",
				"policy updates",
			],
			"Benefits & Compensation": [
				"healthcare",
				"retirement plans",
				"salary reviews",
				"benefit updates",
			],
			# Customer Service
			"Customer Satisfaction": [
				"survey results",
				"feedback analysis",
				"service quality",
				"improvement plans",
			],
			"Support Systems": ["ticketing system", "response times", "support processes", "system updates"],
			"Customer Onboarding": [
				"new client setup",
				"training materials",
				"onboarding process",
				"welcome procedures",
			],
			"Service Quality": [
				"service standards",
				"quality metrics",
				"performance improvement",
				"best practices",
			],
			# Warehouse Operations
			"Inventory Management": [
				"stock levels",
				"inventory tracking",
				"supply chain",
				"product availability",
			],
			"Shipping & Receiving": [
				"delivery schedules",
				"shipping procedures",
				"receiving processes",
				"logistics",
			],
			"Safety Protocols": ["safety training", "accident prevention", "safety equipment", "compliance"],
			"Warehouse Organization": ["layout optimization", "efficiency improvements", "space utilization"],
			"Supplier Coordination": [
				"vendor management",
				"delivery schedules",
				"quality control",
				"supplier relations",
			],
			"Equipment & Maintenance": ["equipment maintenance", "repairs", "upgrades", "safety checks"],
			# Quality Assurance
			"Product Quality Standards": [
				"quality metrics",
				"standards compliance",
				"quality control",
				"testing procedures",
			],
			"Process Improvement": [
				"workflow optimization",
				"efficiency gains",
				"process analysis",
				"improvement initiatives",
			],
			"Compliance & Audits": [
				"regulatory compliance",
				"audit preparation",
				"compliance training",
				"documentation",
			],
		}

	def generate_discussion(self, space_name, space_department, author_email=None):
		"""Generate a complete discussion for a specific space."""

		# Choose author if not specified
		if not author_email:
			dept_characters = get_characters_by_department(space_department)
			if not dept_characters:
				return None
			author_email = random.choice(dept_characters)

		author_profile = get_character_profile(author_email)
		if not author_profile:
			return None

		# Choose discussion type based on space and author personality
		discussion_type = self._choose_discussion_type(space_name, author_profile)

		# Get template and variables
		template = get_random_template(discussion_type)
		if not template:
			return None

		variables = self._generate_template_variables(discussion_type, space_name, author_profile)

		# Fill template with personality-specific modifications
		filled_template = fill_template(template, variables, space_name)

		# Apply personality modifications
		discussion_content = self._apply_personality_to_content(
			filled_template, author_profile, discussion_type
		)

		# Generate comments
		comments = self._generate_comments(discussion_content, space_name, space_department, author_email)

		return {
			"title": discussion_content["title"],
			"content": discussion_content["content"],
			"author": author_email,
			"created_at": self._generate_timestamp(),
			"comments": comments,
		}

	def generate_discussion_with_author(self, space_name, space_department, author_email):
		"""Generate a discussion with a specific author."""
		author_profile = get_character_profile(author_email)

		if not author_profile:
			return None

		# Choose discussion type based on personality
		discussion_type = self._choose_discussion_type(author_profile, space_name)

		# Get template and fill it
		template = get_random_template(discussion_type)
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

	def _choose_discussion_type(self, space_name, author_profile):
		"""Choose appropriate discussion type based on space and author personality."""
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

		# Add space-specific bias
		space_biases = {
			"Sales Targets": ["status_update", "problem_solving"],
			"Financial Audits": ["announcement", "status_update"],
			"Workplace Culture": ["social_fun", "brainstorming"],
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

	def _apply_personality_to_content(self, template_content, author_profile, discussion_type):
		"""Apply character personality traits to modify template content."""
		title = template_content["title"]
		content = template_content["content"]

		personality_traits = author_profile.get("personality_traits", {})
		catchphrases = author_profile.get("catchphrases", [])

		# Apply formality level
		formality = personality_traits.get("formality_level", "casual")
		if formality == "very_casual":
			content = self._make_more_casual(content, author_profile["name"])
		elif formality == "formal":
			content = self._make_more_formal(content)

		# Apply verbosity
		verbosity = personality_traits.get("verbosity", "medium")
		if verbosity == "high":
			content = self._add_extra_details(content, author_profile)
		elif verbosity == "low" or verbosity == "very_low":
			content = self._make_more_concise(content)

		# Add personality-specific phrases
		if random.random() < 0.3 and catchphrases:  # 30% chance to add catchphrase
			catchphrase = random.choice(catchphrases)
			if not catchphrase.endswith(("!", "?", ".")):
				catchphrase += "."
			content += f"\n\n{catchphrase}"

		# Apply confidence level modifications
		confidence = personality_traits.get("confidence", "medium")
		if confidence == "overconfident":
			content = self._add_overconfident_language(content)
		elif confidence == "low_confidence":
			content = self._add_uncertain_language(content)

		return {
			"title": title,
			"content": content,
			"suitable_personalities": template_content.get("suitable_personalities", []),
		}

	def _make_more_casual(self, content, author_name):
		"""Make content more casual and informal."""
		replacements = {
			"Hello everyone": "Hey guys",
			"Dear team": "Hey team",
			"I would like to": "I'd like to",
			"Please let me know": "Let me know",
			"Thank you": "Thanks",
			"regarding": "about",
			"concerning": "about",
		}

		for formal, casual in replacements.items():
			content = content.replace(formal, casual)

		return content

	def _make_more_formal(self, content):
		"""Make content more formal and professional."""
		replacements = {
			"Hey": "Hello",
			"guys": "everyone",
			"Thanks": "Thank you",
			"about": "regarding",
			"Let me know": "Please let me know",
		}

		for casual, formal in replacements.items():
			content = content.replace(casual, formal)

		return content

	def _add_extra_details(self, content, author_profile):
		"""Add extra details for verbose personalities."""
		interests = author_profile.get("interests", [])

		extra_details = [
			"I've been thinking about this quite a bit.",
			"There are several factors to consider here.",
			"This reminds me of a similar situation we had before.",
			"I want to make sure we cover all our bases.",
			"Let me provide some additional context.",
		]

		if interests and random.random() < 0.4:
			if "management theory" in interests:
				extra_details.append(
					"From a management perspective, this is a great opportunity to demonstrate leadership."
				)
			if "beet farming" in interests:
				extra_details.append(
					"This requires the same level of precision we use in agricultural planning."
				)
			if "efficiency" in interests:
				extra_details.append("We need to optimize our approach for maximum efficiency.")

		addition = random.choice(extra_details)
		return content + f"\n\n{addition}"

	def _make_more_concise(self, content):
		"""Make content more concise for brief personalities."""
		# Remove unnecessary words and phrases
		content = re.sub(r"\bJust wanted to\b", "", content)
		content = re.sub(r"\bI think that\b", "", content)
		content = re.sub(r"\bplease note that\b", "", content, flags=re.IGNORECASE)
		content = re.sub(r"\s+", " ", content)  # Remove extra whitespace

		return content.strip()

	def _add_overconfident_language(self, content):
		"""Add overconfident language patterns."""
		confident_additions = [
			"I'm confident this is the right approach.",
			"This is definitely the way to go.",
			"I've got this handled.",
			"Trust me on this one.",
			"I know exactly what we need to do.",
		]

		if random.random() < 0.5:
			addition = random.choice(confident_additions)
			content += f"\n\n{addition}"

		return content

	def _add_uncertain_language(self, content):
		"""Add uncertain language patterns."""
		uncertain_phrases = [
			"I think maybe",
			"I'm not sure, but",
			"This might be",
			"Perhaps we could",
			"I hope this helps",
		]

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

		# Generate 2-6 comments based on available commenters (ensure minimum engagement)
		max_comments = min(6, len(potential_commenters))
		num_comments = random.randint(2, max_comments) if max_comments >= 2 else max_comments

		selected_commenters = random.sample(potential_commenters, num_comments)

		base_timestamp = self._generate_timestamp()

		for i, commenter_email in enumerate(selected_commenters):
			# Ensure at least first 2 commenters always comment, then use probability for others
			force_comment = i < 2
			if force_comment or should_comment(commenter_email, author_email):
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
		replacements = {
			"I agree": "Totally agree",
			"That is": "That's",
			"I think": "I think",
			"This is": "This is",
		}

		for formal, casual in replacements.items():
			comment = comment.replace(formal, casual)

		return comment

	def _make_comment_formal(self, comment):
		"""Make comment more formal."""
		if not comment.endswith("."):
			comment += "."

		return comment

	def _generate_timestamp(self):
		"""Generate a realistic timestamp for posts (within last 30 days)."""
		now = datetime.now()
		days_ago = random.randint(0, 30)
		hours_ago = random.randint(0, 23)
		minutes_ago = random.randint(0, 59)

		return now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)


# Convenience function for generating multiple discussions
def generate_discussions_for_space(space_name, space_department, num_discussions=5):
	"""Generate multiple discussions for a specific space."""
	generator = DiscussionGenerator()
	discussions = []

	for _ in range(num_discussions):
		discussion = generator.generate_discussion(space_name, space_department)
		if discussion:
			discussions.append(discussion)

	return discussions


def generate_discussions_for_all_spaces(spaces_by_department, discussions_per_space=3):
	"""Generate discussions for all spaces across departments."""
	all_discussions = []

	for department, spaces in spaces_by_department.items():
		for space in spaces:
			discussions = generate_discussions_for_space(space, department, discussions_per_space)
			all_discussions.extend(discussions)

	return all_discussions
