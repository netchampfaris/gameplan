# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Relationship matrix defining character interactions, department relationships,
and collaboration patterns for realistic discussion generation.
"""

import random

# Define relationship types and their characteristics
RELATIONSHIP_TYPES = {
	"boss_subordinate": {
		"interaction_frequency": "high",
		"tone": "professional_directive",
		"topics": ["performance", "assignments", "feedback", "goals"],
	},
	"peers": {
		"interaction_frequency": "medium",
		"tone": "collaborative",
		"topics": ["coordination", "shared_projects", "advice", "updates"],
	},
	"friends": {
		"interaction_frequency": "high",
		"tone": "casual_friendly",
		"topics": ["personal", "work_gossip", "social_events", "mutual_support"],
	},
	"rivals": {
		"interaction_frequency": "medium",
		"tone": "competitive_tense",
		"topics": ["competition", "one_upmanship", "disagreements"],
	},
	"awkward": {
		"interaction_frequency": "low",
		"tone": "uncomfortable_formal",
		"topics": ["necessary_work_only", "brief_updates"],
	},
	"mentor_mentee": {
		"interaction_frequency": "medium",
		"tone": "supportive_guiding",
		"topics": ["learning", "career_advice", "skill_development"],
	},
	"romantic": {
		"interaction_frequency": "high",
		"tone": "affectionate_supportive",
		"topics": ["support", "personal", "shared_interests"],
	},
}

# Character relationship matrix
CHARACTER_RELATIONSHIPS = {
	"michael.scott@dundermifflin.com": {
		"jim.halpert@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "friendly_boss",
			"interaction_probability": 0.8,
			"comment_probability": 0.7,
			"notes": "Michael sees Jim as his favorite, Jim is respectful but sometimes eye-rolls",
		},
		"dwight.schrute@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "devoted_assistant",
			"interaction_probability": 0.9,
			"comment_probability": 0.8,
			"notes": "Dwight is extremely loyal, Michael takes advantage but appreciates it",
		},
		"pam.beesly@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "protective_boss",
			"interaction_probability": 0.7,
			"comment_probability": 0.6,
			"notes": "Michael is protective of Pam, she's polite but finds him inappropriate",
		},
		"angela.martin@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "professional_tension",
			"interaction_probability": 0.6,
			"comment_probability": 0.4,
			"notes": "Angela finds Michael unprofessional, Michael is intimidated by her",
		},
		"toby.flenderson@dundermifflin.com": {
			"type": "awkward",
			"dynamic": "mutual_dislike",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Michael hates Toby, Toby is professionally cordial",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "indifferent_employee",
			"interaction_probability": 0.4,
			"comment_probability": 0.2,
			"notes": "Stanley ignores Michael when possible, Michael tries too hard",
		},
		"kevin.malone@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "sympathetic_boss",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Michael treats Kevin kindly, Kevin appreciates but doesn't understand much",
		},
		"oscar.martinez@dundermifflin.com": {
			"type": "boss_subordinate",
			"dynamic": "intellectual_intimidation",
			"interaction_probability": 0.5,
			"comment_probability": 0.4,
			"notes": "Michael is intimidated by Oscar's intelligence, Oscar is politely condescending",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "trying_to_be_cool",
			"interaction_probability": 0.5,
			"comment_probability": 0.3,
			"notes": "Michael tries to be cool around Darryl, Darryl finds him ridiculous",
		},
	},
	"jim.halpert@dundermifflin.com": {
		"pam.beesly@dundermifflin.com": {
			"type": "romantic",
			"dynamic": "loving_couple",
			"interaction_probability": 0.9,
			"comment_probability": 0.8,
			"notes": "Married couple, very supportive of each other",
		},
		"dwight.schrute@dundermifflin.com": {
			"type": "rivals",
			"dynamic": "prankster_victim",
			"interaction_probability": 0.8,
			"comment_probability": 0.6,
			"notes": "Jim pranks Dwight constantly, competitive sales relationship",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "mutual_respect",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Both are practical, minimal but respectful interaction",
		},
		"angela.martin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "polite_distance",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Cordial but limited interaction",
		},
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "friendly_coworker",
			"interaction_probability": 0.5,
			"comment_probability": 0.4,
			"notes": "Jim is kind to Kevin, Kevin looks up to Jim",
		},
		"oscar.martinez@dundermifflin.com": {
			"type": "peers",
			"dynamic": "intellectual_peers",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Both are intelligent, have good conversations",
		},
		"toby.flenderson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "sympathetic_coworker",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Jim feels bad for Toby, occasionally defends him",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "friends",
			"dynamic": "casual_friends",
			"interaction_probability": 0.6,
			"comment_probability": 0.4,
			"notes": "Genuine friendship, hang out occasionally",
		},
	},
	"dwight.schrute@dundermifflin.com": {
		"angela.martin@dundermifflin.com": {
			"type": "romantic",
			"dynamic": "secret_relationship",
			"interaction_probability": 0.7,
			"comment_probability": 0.4,
			"notes": "Complex romantic history, professional in public",
		},
		"pam.beesly@dundermifflin.com": {
			"type": "peers",
			"dynamic": "grudging_respect",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Initially adversarial, eventually mutual respect",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "mutual_annoyance",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Stanley finds Dwight annoying, Dwight thinks Stanley is lazy",
		},
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "condescending_coworker",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Dwight thinks Kevin is incompetent",
		},
		"oscar.martinez@dundermifflin.com": {
			"type": "peers",
			"dynamic": "intellectual_competition",
			"interaction_probability": 0.5,
			"comment_probability": 0.4,
			"notes": "Dwight tries to prove he's smarter, Oscar corrects him",
		},
		"toby.flenderson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "authority_supporter",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Dwight doesn't like HR but respects authority",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "wannabe_friend",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Dwight wants to be friends, Darryl finds him weird",
		},
	},
	"angela.martin@dundermifflin.com": {
		"oscar.martinez@dundermifflin.com": {
			"type": "peers",
			"dynamic": "accounting_trio",
			"interaction_probability": 0.8,
			"comment_probability": 0.6,
			"notes": "Work closely together, professional relationship",
		},
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "frustrated_coworker",
			"interaction_probability": 0.7,
			"comment_probability": 0.4,
			"notes": "Angela is constantly frustrated with Kevin's incompetence",
		},
		"pam.beesly@dundermifflin.com": {
			"type": "peers",
			"dynamic": "party_planning_committee",
			"interaction_probability": 0.6,
			"comment_probability": 0.4,
			"notes": "Work together on events, Angela is controlling",
		},
		"toby.flenderson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "rule_followers",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Both appreciate proper procedures",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "minimal_interaction",
			"interaction_probability": 0.2,
			"comment_probability": 0.1,
			"notes": "Very little interaction, both prefer to be left alone",
		},
	},
	"oscar.martinez@dundermifflin.com": {
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "patient_coworker",
			"interaction_probability": 0.8,
			"comment_probability": 0.5,
			"notes": "Oscar tries to help Kevin, often frustrated",
		},
		"toby.flenderson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "intellectual_allies",
			"interaction_probability": 0.5,
			"comment_probability": 0.4,
			"notes": "Both are rational, educated, get along well",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "mutual_respect",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Both are competent, minimal but respectful interaction",
		},
		"pam.beesly@dundermifflin.com": {
			"type": "friends",
			"dynamic": "friendly_coworkers",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Genuine friendship, Oscar gives Pam advice",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "professional_colleagues",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Respectful professional relationship",
		},
	},
	"toby.flenderson@dundermifflin.com": {
		"pam.beesly@dundermifflin.com": {
			"type": "friends",
			"dynamic": "sympathetic_friend",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Pam is kind to Toby, he appreciates her friendship",
		},
		"stanley.hudson@dundermifflin.com": {
			"type": "peers",
			"dynamic": "fellow_sufferers",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Both endure Michael's behavior, mutual understanding",
		},
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "patient_hr",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Toby helps Kevin with HR issues patiently",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "professional_relationship",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Limited but respectful interaction",
		},
	},
	"stanley.hudson@dundermifflin.com": {
		"kevin.malone@dundermifflin.com": {
			"type": "peers",
			"dynamic": "tolerant_coworker",
			"interaction_probability": 0.3,
			"comment_probability": 0.2,
			"notes": "Stanley tolerates Kevin, minimal interaction",
		},
		"pam.beesly@dundermifflin.com": {
			"type": "peers",
			"dynamic": "friendly_acquaintance",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Stanley likes Pam, she's one of the few he's nice to",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "mutual_understanding",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Both are practical, no-nonsense workers",
		},
	},
	"kevin.malone@dundermifflin.com": {
		"pam.beesly@dundermifflin.com": {
			"type": "friends",
			"dynamic": "caring_friend",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Pam is kind to Kevin, he adores her",
		},
		"darryl.philbin@dundermifflin.com": {
			"type": "peers",
			"dynamic": "friendly_acquaintance",
			"interaction_probability": 0.4,
			"comment_probability": 0.3,
			"notes": "Darryl is patient with Kevin",
		},
	},
	"pam.beesly@dundermifflin.com": {
		"darryl.philbin@dundermifflin.com": {
			"type": "friends",
			"dynamic": "good_friends",
			"interaction_probability": 0.6,
			"comment_probability": 0.5,
			"notes": "Genuine friendship, mutual respect",
		}
	},
}


# Department interaction patterns
DEPARTMENT_INTERACTIONS = {
	"Executive Management": {
		"initiates_to": [
			"Sales Department",
			"Accounting Department",
			"Human Resources",
			"Warehouse Operations",
		],
		"frequency": "high",
		"topics": ["performance", "goals", "announcements", "company_wide"],
	},
	"Sales Department": {
		"initiates_to": ["Customer Service", "Warehouse Operations", "Accounting Department"],
		"frequency": "medium",
		"topics": ["client_issues", "order_coordination", "sales_support"],
	},
	"Accounting Department": {
		"initiates_to": ["Sales Department", "Warehouse Operations", "Executive Management"],
		"frequency": "medium",
		"topics": ["financial_matters", "expense_reports", "budget_questions"],
	},
	"Human Resources": {
		"initiates_to": [
			"Executive Management",
			"Sales Department",
			"Accounting Department",
			"Warehouse Operations",
		],
		"frequency": "low",
		"topics": ["policy_updates", "training", "compliance"],
	},
	"Customer Service": {
		"initiates_to": ["Sales Department", "Warehouse Operations"],
		"frequency": "medium",
		"topics": ["customer_issues", "order_problems", "service_requests"],
	},
	"Warehouse Operations": {
		"initiates_to": ["Sales Department", "Customer Service"],
		"frequency": "medium",
		"topics": ["inventory", "shipping", "logistics"],
	},
}


def get_character_relationships(character_email):
	"""Get all relationships for a specific character."""
	relationships = CHARACTER_RELATIONSHIPS.get(character_email, {})

	# Also check if the character appears in other character's relationships
	reverse_relationships = {}
	for other_char, other_relationships in CHARACTER_RELATIONSHIPS.items():
		if character_email in other_relationships:
			reverse_relationships[other_char] = other_relationships[character_email]

	# Merge both directions
	all_relationships = {**relationships, **reverse_relationships}
	return all_relationships


def get_interaction_probability(char1_email, char2_email):
	"""Get the probability that two characters will interact."""
	relationships = get_character_relationships(char1_email)
	if char2_email in relationships:
		return relationships[char2_email].get("interaction_probability", 0.5)
	return 0.1  # Default low probability for unspecified relationships


def get_comment_probability(char1_email, char2_email):
	"""Get the probability that char1 will comment on char2's posts."""
	relationships = get_character_relationships(char1_email)
	if char2_email in relationships:
		return relationships[char2_email].get("comment_probability", 0.3)
	return 0.05  # Default very low probability


def should_interact(char1_email, char2_email):
	"""Determine if two characters should interact based on their relationship."""
	probability = get_interaction_probability(char1_email, char2_email)
	return random.random() < probability


def should_comment(commenter_email, author_email):
	"""Determine if a character should comment on another's post."""
	probability = get_comment_probability(commenter_email, author_email)
	return random.random() < probability


def get_department_interaction_frequency(dept1, dept2):
	"""Get how often departments interact with each other."""
	dept1_interactions = DEPARTMENT_INTERACTIONS.get(dept1, {})
	if dept2 in dept1_interactions.get("initiates_to", []):
		return dept1_interactions.get("frequency", "low")

	dept2_interactions = DEPARTMENT_INTERACTIONS.get(dept2, {})
	if dept1 in dept2_interactions.get("initiates_to", []):
		return dept2_interactions.get("frequency", "low")

	return "low"


def get_likely_participants(space_name, space_department, max_participants=8):
	"""Get likely participants for a discussion in a specific space."""
	from .personality_profiles import CHARACTER_PROFILES, get_characters_by_department

	# Start with people from the same department
	same_dept_chars = get_characters_by_department(space_department)
	participants = same_dept_chars.copy()

	# Add people from related departments based on interaction patterns
	dept_interactions = DEPARTMENT_INTERACTIONS.get(space_department, {})
	related_depts = dept_interactions.get("initiates_to", [])

	for dept in related_depts:
		dept_chars = get_characters_by_department(dept)
		# Add some characters from related departments
		for char in dept_chars:
			if len(participants) < max_participants and random.random() < 0.4:
				participants.append(char)

	# Ensure we don't exceed max participants
	if len(participants) > max_participants:
		participants = random.sample(participants, max_participants)

	return participants


def get_relationship_dynamic(char1_email, char2_email):
	"""Get the relationship dynamic between two characters."""
	relationships = get_character_relationships(char1_email)
	if char2_email in relationships:
		return relationships[char2_email].get("dynamic", "neutral")
	return "neutral"
