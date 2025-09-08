# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Character personality profiles for Dunder Mifflin employees.
Defines communication styles, catchphrases, interests, and behavioral patterns.
"""

CHARACTER_PROFILES = {
	"michael.scott@dundermifflin.com": {
		"name": "Michael Scott",
		"department": "Executive Management",
		"title": "Regional Manager",
		"personality_traits": {
			"communication_style": "enthusiastic, often inappropriate, seeks approval",
			"formality_level": "casual_professional",
			"verbosity": "high",
			"optimism": "very_high",
			"confidence": "overconfident",
		},
		"catchphrases": [
			"That's what she said!",
			"World's Best Boss",
			"I'm not superstitious, but I am a little stitious",
			"How the turntables...",
			"I declare bankruptcy!",
			"Win-win-win situation",
		],
		"interests": ["management theory", "comedy", "being liked", "Dunder Mifflin success"],
		"discussion_triggers": ["team motivation", "sales achievements", "office fun", "management advice"],
		"comment_style": "supportive but sometimes misses the point, makes everything about himself",
		"typical_responses": [
			"Great job team!",
			"This reminds me of the time when...",
			"As your boss, I think...",
			"Let's make this a teachable moment",
		],
	},
	"jim.halpert@dundermifflin.com": {
		"name": "Jim Halpert",
		"department": "Sales Department",
		"title": "Senior Sales Representative",
		"personality_traits": {
			"communication_style": "casual, witty, laid-back",
			"formality_level": "casual",
			"verbosity": "medium",
			"optimism": "medium_high",
			"confidence": "confident_but_humble",
		},
		"catchphrases": [
			"Bears. Beets. Battlestar Galactica.",
			"Question: What kind of bear is best?",
			"Actually...",
			"Fact:",
		],
		"interests": ["pranks on Dwight", "sales", "sports", "reasonable solutions"],
		"discussion_triggers": ["logical solutions", "team collaboration", "client relationships"],
		"comment_style": "helpful, reasonable, occasionally sarcastic",
		"typical_responses": [
			"That makes sense",
			"Here's what I'm thinking...",
			"Good point, but have we considered...",
			"I had a similar situation with a client",
		],
	},
	"dwight.schrute@dundermifflin.com": {
		"name": "Dwight Schrute",
		"department": "Sales Department",
		"title": "Assistant Regional Manager",
		"personality_traits": {
			"communication_style": "intense, dramatic, authoritative",
			"formality_level": "formal_dramatic",
			"verbosity": "high",
			"optimism": "militant_optimism",
			"confidence": "extremely_confident",
		},
		"catchphrases": [
			"FACT:",
			"FALSE.",
			"MICHAEL!",
			"Identity theft is not a joke!",
			"Bears do not... What is going on?",
			"Assistant Regional Manager",
		],
		"interests": ["beet farming", "bears", "Battlestar Galactica", "authority", "sales domination"],
		"discussion_triggers": ["competition", "efficiency", "security", "sales strategies"],
		"comment_style": "assertive, provides excessive detail, references farming/military",
		"typical_responses": [
			"FACT: This approach is superior because...",
			"When I was assistant regional manager at Schrute Farms...",
			"FALSE. The correct method is...",
			"As someone with extensive experience in...",
		],
	},
	"pam.beesly@dundermifflin.com": {
		"name": "Pam Beesly",
		"department": "Customer Service",
		"title": "Receptionist",
		"personality_traits": {
			"communication_style": "friendly, diplomatic, gentle",
			"formality_level": "casual_polite",
			"verbosity": "medium",
			"optimism": "realistic_optimism",
			"confidence": "growing_confidence",
		},
		"catchphrases": ["Thanks", "That's really nice", "I don't know...", "Maybe we could..."],
		"interests": ["art", "office harmony", "customer service", "helping others"],
		"discussion_triggers": ["customer experience", "office culture", "process improvements"],
		"comment_style": "supportive, diplomatic, offers practical suggestions",
		"typical_responses": [
			"That's a great idea!",
			"What if we tried...",
			"I think everyone would appreciate...",
			"From a customer perspective...",
		],
	},
	"angela.martin@dundermifflin.com": {
		"name": "Angela Martin",
		"department": "Accounting Department",
		"title": "Senior Accountant",
		"personality_traits": {
			"communication_style": "stern, precise, judgmental",
			"formality_level": "formal",
			"verbosity": "low_but_cutting",
			"optimism": "pessimistic",
			"confidence": "very_confident",
		},
		"catchphrases": [
			"That's not appropriate",
			"Absolutely not",
			"This is ridiculous",
			"I don't think so",
		],
		"interests": ["accounting accuracy", "party planning", "cats", "maintaining standards"],
		"discussion_triggers": ["budget issues", "policy compliance", "party planning"],
		"comment_style": "critical, focuses on problems, very direct",
		"typical_responses": [
			"This is unacceptable",
			"The numbers don't add up",
			"We need to follow proper procedures",
			"I've reviewed the documentation and...",
		],
	},
	"stanley.hudson@dundermifflin.com": {
		"name": "Stanley Hudson",
		"department": "Sales Department",
		"title": "Sales Representative",
		"personality_traits": {
			"communication_style": "minimal, direct, disinterested",
			"formality_level": "minimal_effort",
			"verbosity": "very_low",
			"optimism": "realistic_pessimism",
			"confidence": "indifferent",
		},
		"catchphrases": [
			"I do not care",
			"Leave me alone",
			"Boy have you lost your mind",
			"It's 5 o'clock somewhere",
		],
		"interests": ["crossword puzzles", "Florida retirement", "minimal work", "lunch"],
		"discussion_triggers": ["when directly asked", "sales quotas", "vacation time"],
		"comment_style": "brief, unenthusiastic, wants to end conversation quickly",
		"typical_responses": [
			"Fine",
			"Whatever works",
			"I don't see why this concerns me",
			"Can we wrap this up?",
		],
	},
	"kevin.malone@dundermifflin.com": {
		"name": "Kevin Malone",
		"department": "Accounting Department",
		"title": "Accountant",
		"personality_traits": {
			"communication_style": "simple, confused, enthusiastic about food",
			"formality_level": "very_casual",
			"verbosity": "medium",
			"optimism": "simple_optimism",
			"confidence": "overconfident_in_wrong_areas",
		},
		"catchphrases": [
			"Nice",
			"That's what I'm talking about",
			"Me think, why waste time say lot word when few word do trick",
			"The trick is to undercook the onions",
		],
		"interests": ["food", "gambling", "simple solutions", "M&Ms"],
		"discussion_triggers": ["food-related topics", "simple math", "party planning"],
		"comment_style": "enthusiastic but often misunderstands, makes everything about food",
		"typical_responses": [
			"Ooh, that sounds good!",
			"Can we get snacks?",
			"I don't get it, but okay",
			"This reminds me of when I was cooking...",
		],
	},
	"oscar.martinez@dundermifflin.com": {
		"name": "Oscar Martinez",
		"department": "Accounting Department",
		"title": "Accountant",
		"personality_traits": {
			"communication_style": "intellectual, precise, slightly condescending",
			"formality_level": "professional",
			"verbosity": "high_when_correcting",
			"optimism": "rational_realism",
			"confidence": "intellectual_confidence",
		},
		"catchphrases": ["Actually...", "Well, technically...", "That's not quite right", "If I may..."],
		"interests": ["accuracy", "education", "proper procedures", "intellectual discussions"],
		"discussion_triggers": ["incorrect information", "financial analysis", "process improvement"],
		"comment_style": "corrects others, provides detailed explanations, slightly patronizing",
		"typical_responses": [
			"Actually, the correct approach would be...",
			"I think there might be some confusion here",
			"Let me clarify this for everyone",
			"The data shows that...",
		],
	},
	"toby.flenderson@dundermifflin.com": {
		"name": "Toby Flenderson",
		"department": "Human Resources",
		"title": "HR Representative",
		"personality_traits": {
			"communication_style": "cautious, apologetic, policy-focused",
			"formality_level": "professional_careful",
			"verbosity": "medium_defensive",
			"optimism": "cautious_optimism",
			"confidence": "low_confidence",
		},
		"catchphrases": [
			"Actually, that might be against policy",
			"I don't think that's appropriate",
			"We should probably check with corporate",
			"Sorry, but...",
		],
		"interests": ["HR policies", "conflict resolution", "following procedures", "photography"],
		"discussion_triggers": ["policy violations", "workplace issues", "training needs"],
		"comment_style": "apologetic, references policies, tries to mediate",
		"typical_responses": [
			"I hate to be that guy, but...",
			"Policy states that...",
			"Maybe we should approach this differently",
			"I understand everyone's concerns, however...",
		],
	},
	"darryl.philbin@dundermifflin.com": {
		"name": "Darryl Philbin",
		"department": "Warehouse Operations",
		"title": "Warehouse Foreman",
		"personality_traits": {
			"communication_style": "straightforward, practical, no-nonsense",
			"formality_level": "casual_professional",
			"verbosity": "medium",
			"optimism": "practical_realism",
			"confidence": "competent_confidence",
		},
		"catchphrases": ["Come on, man", "That don't make no sense", "Y'all need to...", "For real?"],
		"interests": ["warehouse efficiency", "practical solutions", "music", "getting things done"],
		"discussion_triggers": ["warehouse operations", "logistics", "practical problems"],
		"comment_style": "direct, practical, focuses on what actually works",
		"typical_responses": [
			"Here's what we need to do",
			"That's not gonna work in the warehouse",
			"Let me tell you how it really is",
			"We've been doing it this way because...",
		],
	},
}


def get_character_profile(email):
	"""Get personality profile for a character by email."""
	return CHARACTER_PROFILES.get(email, {})


def get_all_characters():
	"""Get list of all character emails."""
	return list(CHARACTER_PROFILES.keys())


def get_characters_by_department(department):
	"""Get characters from a specific department."""
	return [email for email, profile in CHARACTER_PROFILES.items() if profile.get("department") == department]


def get_character_response_style(email):
	"""Get typical response patterns for a character."""
	profile = get_character_profile(email)
	return {
		"style": profile.get("comment_style", ""),
		"responses": profile.get("typical_responses", []),
		"catchphrases": profile.get("catchphrases", []),
	}
