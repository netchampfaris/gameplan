# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Discussion and comment templates for generating realistic workplace conversations.
Templates are categorized by discussion type and include personality-driven variations.
"""

import random

DISCUSSION_TEMPLATES = {
	"status_update": {
		"templates": [
			{
				"title": "{timeframe} {metric} Update",
				"content": "Hey everyone,\n\nJust wanted to share our {timeframe} {metric} numbers. {status_description}\n\n{details}\n\n{call_to_action}",
				"suitable_personalities": ["enthusiastic", "professional", "data_driven"],
			},
			{
				"title": "Quick update on {topic}",
				"content": "{greeting}\n\nWanted to give everyone a heads up on {topic}. {brief_status}\n\n{next_steps}",
				"suitable_personalities": ["casual", "direct"],
			},
		],
		"variables": {
			"timeframe": ["Weekly", "Monthly", "Quarterly", "End of Week", "Mid-month"],
			"metric": ["Sales", "Customer Satisfaction", "Inventory", "Performance", "Progress"],
			"status_description": [
				"Things are looking good!",
				"We're on track to meet our goals.",
				"Numbers are solid this period.",
				"Some interesting trends to discuss.",
				"Mixed results but overall positive.",
			],
			"greeting": ["Hi team,", "Hey everyone,", "Team,", "All,"],
			"topic": [
				"the {space_name} initiative",
				"our progress",
				"recent developments",
				"this week's focus",
			],
			"call_to_action": [
				"Let me know if you have any questions!",
				"Thoughts?",
				"Looking forward to your feedback.",
				"What do you all think?",
			],
		},
	},
	"problem_solving": {
		"templates": [
			{
				"title": "Need help with {problem_area}",
				"content": "Hey team,\n\nI'm running into an issue with {problem_description}. {context}\n\nHas anyone dealt with something like this before? {specific_ask}",
				"suitable_personalities": ["collaborative", "direct", "problem_solver"],
			},
			{
				"title": "{urgency_level}: {problem_type} Issue",
				"content": "{urgency_opener}\n\nWe've got a {problem_type} situation that needs attention. {problem_details}\n\n{proposed_solution}\n\nThoughts on next steps?",
				"suitable_personalities": ["urgent", "professional", "solution_focused"],
			},
		],
		"variables": {
			"problem_area": [
				"client communication",
				"process efficiency",
				"system integration",
				"deadline management",
			],
			"problem_description": [
				"a client request that's outside our usual scope",
				"a process that's taking way longer than expected",
				"coordinating between departments",
				"a technical issue that's blocking progress",
			],
			"urgency_level": ["Urgent", "Important", "Time Sensitive", "Priority"],
			"urgency_opener": [
				"This needs immediate attention.",
				"Flagging this as high priority.",
				"We need to address this quickly.",
				"Time-sensitive issue here.",
				"This just came up and needs quick action.",
			],
			"problem_type": ["Client", "Process", "System", "Communication", "Resource"],
			"problem_details": [
				"It's affecting our delivery timeline and client satisfaction.",
				"This could impact multiple teams if we don't act fast.",
				"The implications are bigger than we initially thought.",
				"It's creating a bottleneck in our workflow.",
				"We're seeing cascading effects across departments.",
			],
			"proposed_solution": [
				"I think we should convene a quick team meeting to brainstorm solutions.",
				"My suggestion is to prioritize this over other tasks temporarily.",
				"We might need to bring in additional resources to resolve this.",
				"Let's implement a temporary workaround while we find a permanent fix.",
				"I recommend we escalate this to get the right stakeholders involved.",
			],
			"specific_ask": [
				"Any suggestions would be helpful!",
				"Open to any ideas you might have.",
				"Could really use some fresh perspective on this.",
				"What would you do in this situation?",
			],
			"context": [
				"This has been on my radar for a while.",
				"I've been working on this with the team.",
				"This came up in our last meeting.",
				"Several people have mentioned this to me.",
				"I wanted to get everyone's input on this.",
			],
		},
	},
	"announcement": {
		"templates": [
			{
				"title": "New {announcement_type}: {topic}",
				"content": "Hi everyone,\n\n{announcement_opener} {main_announcement}\n\n{details}\n\n{effective_date}\n\n{closing}",
				"suitable_personalities": ["formal", "authoritative", "informative"],
			},
			{
				"title": "{topic} - Important Update",
				"content": "Team,\n\nQuick announcement about {topic}. {brief_description}\n\n{key_points}\n\nLet me know if you have questions!",
				"suitable_personalities": ["direct", "professional"],
			},
		],
		"variables": {
			"announcement_type": ["Policy", "Procedure", "Process", "Initiative", "Program"],
			"topic": ["expense reporting", "meeting schedules", "office protocols", "system updates"],
			"announcement_opener": [
				"I wanted to let everyone know about",
				"We're implementing",
				"Starting next week, we'll be",
				"Please note the following changes to",
			],
			"effective_date": [
				"This goes into effect immediately.",
				"This will start next Monday.",
				"Effective beginning of next month.",
				"Rolling out over the next two weeks.",
			],
		},
	},
	"brainstorming": {
		"templates": [
			{
				"title": "Ideas needed: {brainstorm_topic}",
				"content": "Hey team!\n\n{context_setup} {brainstorm_ask}\n\n{background}\n\nNo idea is too crazy - let's hear what you're thinking!",
				"suitable_personalities": ["creative", "collaborative", "enthusiastic"],
			},
			{
				"title": "Brainstorming session: {topic}",
				"content": "{opener}\n\nI'd love to get everyone's thoughts on {topic}. {specific_focus}\n\n{current_thinking}\n\nWhat are your ideas?",
				"suitable_personalities": ["inclusive", "thoughtful"],
			},
		],
		"variables": {
			"brainstorm_topic": [
				"improving {space_name}",
				"client engagement strategies",
				"process optimization",
				"team collaboration",
			],
			"context_setup": [
				"We're looking to improve",
				"I've been thinking about ways to enhance",
				"There's an opportunity to optimize",
				"We could really benefit from fresh ideas on",
			],
			"opener": ["Hi everyone,", "Team,", "Hey all,", "Hi team,"],
		},
	},
	"question_help": {
		"templates": [
			{
				"title": "Quick question about {question_topic}",
				"content": "Hi all,\n\n{question_context} {main_question}\n\n{additional_context}\n\nThanks in advance!",
				"suitable_personalities": ["polite", "direct", "collaborative"],
			},
			{
				"title": "Help needed: {help_area}",
				"content": "{greeting}\n\nI could use some help with {help_description}. {specific_question}\n\n{background_info}\n\nAny guidance would be appreciated!",
				"suitable_personalities": ["humble", "collaborative"],
			},
		],
		"variables": {
			"question_topic": ["process procedures", "client requirements", "system access", "documentation"],
			"help_area": [
				"understanding a process",
				"client communication",
				"system navigation",
				"report generation",
			],
			"question_context": [
				"I'm trying to figure out",
				"Can someone help me understand",
				"I'm a bit confused about",
				"Quick question about",
			],
		},
	},
	"social_fun": {
		"templates": [
			{
				"title": "{event_type} Planning - {occasion}",
				"content": "Hey everyone!\n\n{event_announcement} {event_details}\n\n{participation_ask}\n\nLet me know what you think!",
				"suitable_personalities": ["enthusiastic", "social", "organized"],
			},
			{
				"title": "{fun_topic}",
				"content": "{casual_opener}\n\n{fun_content}\n\n{engagement_question}",
				"suitable_personalities": ["casual", "fun", "social"],
			},
		],
		"variables": {
			"event_type": ["Office Party", "Team Lunch", "Celebration", "Team Building"],
			"occasion": ["Monthly Celebration", "Project Completion", "Holiday Party", "Team Milestone"],
			"fun_topic": ["Friday Fun Fact", "Office Trivia", "Lunch Recommendations", "Weekend Plans"],
			"casual_opener": [
				"Hope everyone's having a good week!",
				"Happy Friday everyone!",
				"Quick break from work...",
				"Just for fun...",
			],
		},
	},
	"complaint_concern": {
		"templates": [
			{
				"title": "Concern about {concern_area}",
				"content": "Hi team,\n\n{concern_opener} {main_concern}\n\n{impact_description}\n\n{proposed_solution}\n\nWhat do you all think?",
				"suitable_personalities": ["diplomatic", "concerned", "solution_focused"],
			},
			{
				"title": "{issue_type} - Need to Address",
				"content": "{direct_opener}\n\n{issue_description} {impact}\n\n{call_for_action}",
				"suitable_personalities": ["direct", "frustrated", "urgent"],
			},
		],
		"variables": {
			"concern_area": [
				"process efficiency",
				"communication gaps",
				"resource allocation",
				"deadline management",
			],
			"issue_type": ["Process Issue", "Communication Problem", "Resource Concern", "Timeline Issue"],
			"concern_opener": [
				"I wanted to bring up something that's been on my mind:",
				"I think we need to discuss",
				"I've noticed an issue with",
				"There's something we should address:",
			],
			"call_for_action": [
				"How can we fix this?",
				"What's the best way to handle this going forward?",
				"We need to find a solution soon.",
				"This needs to be resolved quickly.",
			],
		},
	},
}


COMMENT_TEMPLATES = {
	"agreement": [
		"Totally agree with this!",
		"This makes a lot of sense.",
		"Great point, {author}!",
		"I'm on board with this approach.",
		"Exactly what I was thinking.",
	],
	"question": [
		"Quick question - {question}",
		"Can you clarify {clarification_point}?",
		"What about {consideration}?",
		"Have we considered {alternative}?",
		"How would this work with {related_area}?",
	],
	"suggestion": [
		"What if we tried {suggestion}?",
		"Another option might be {alternative}.",
		"I'd suggest {recommendation}.",
		"We could also {additional_approach}.",
		"Have you thought about {idea}?",
	],
	"support": [
		"I can help with {offer_area}.",
		"Count me in for {task}.",
		"I've got experience with {expertise_area}.",
		"Happy to assist with {help_area}.",
		"Let me know if you need help with {support_area}.",
	],
	"concern": [
		"I'm a bit worried about {concern}.",
		"One thing to consider is {consideration}.",
		"We might want to be careful about {caution_area}.",
		"I see a potential issue with {problem_area}.",
		"This could affect {impact_area}.",
	],
}


def get_random_template(discussion_type):
	"""Get a random template for a discussion type."""
	if discussion_type not in DISCUSSION_TEMPLATES:
		return None
	return random.choice(DISCUSSION_TEMPLATES[discussion_type]["templates"])


def get_template_variables(discussion_type):
	"""Get available variables for a discussion type."""
	if discussion_type not in DISCUSSION_TEMPLATES:
		return {}
	return DISCUSSION_TEMPLATES[discussion_type].get("variables", {})


def get_random_comment_template(comment_type):
	"""Get a random comment template by type."""
	if comment_type not in COMMENT_TEMPLATES:
		return None
	return random.choice(COMMENT_TEMPLATES[comment_type])


def fill_template(template, variables, space_name=None):
	"""Fill a template with provided variables."""
	content = template["content"]
	title = template["title"]

	# Replace space-specific variables
	if space_name:
		variables["space_name"] = space_name

	# Fill in variables in both title and content
	for var_name, var_value in variables.items():
		if isinstance(var_value, list):
			var_value = random.choice(var_value)

		placeholder = "{" + var_name + "}"
		title = title.replace(placeholder, str(var_value))
		content = content.replace(placeholder, str(var_value))

	return {
		"title": title,
		"content": content,
		"suitable_personalities": template.get("suitable_personalities", []),
	}
