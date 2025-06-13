# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import json
import re
from typing import Any

import frappe
import frappe.utils
import requests
from werkzeug.wrappers import Response

# Import task tools
from .gp_task_tools import GPTaskTools


def get_ollama_config() -> dict[str, str]:
	"""Get Ollama configuration from site config or use defaults"""
	try:
		config = frappe.get_site_config()
		return {
			"base_url": config.get("ollama_base_url", "http://localhost:11434"),
			"model": config.get("ollama_model", "qwen3:latest"),
			"timeout": config.get("ollama_timeout", 120),
		}
	except Exception:
		return {"base_url": "http://localhost:11434", "model": "qwen3:latest", "timeout": 120}


def get_system_prompt() -> str:
	"""Get the system prompt for Juno AI assistant"""
	return (
		"You are Juno, an AI assistant that helps users manage their tasks, projects, and schedule efficiently. "
		"You have access to comprehensive task management tools that allow you to:\n\n"
		"**Task Management Capabilities:**\n"
		"- Show and filter tasks by status, priority, project, or due date\n"
		"- Create new tasks with all necessary details\n"
		"- Update existing tasks (status, priority, due dates, assignments, etc.)\n"
		"- Search tasks by title or description\n"
		"- Provide task summaries and analytics\n\n"
		"**User Assignment Guidelines:**\n"
		"- When creating tasks, if no assignee is specified, assign to current user\n"
		"- Use real user emails that exist in the system (like admin@example.com, not fictional ones)\n"
		"- If a user doesn't exist, the system will suggest available users\n"
		"- For demos or examples, omit the assigned_to field to assign to current user\n\n"
		"**Natural Language Understanding:**\n"
		"When users mention tasks, understand their intent:\n"
		"- 'Show my tasks' → Use get_user_tasks\n"
		"- 'Add this to my tasks' → Use create_task\n"
		"- 'Update the due date for X task' → Use update_task\n"
		"- 'Mark X as done' → Update task status to Done\n"
		"- 'What's on my plate today?' → Show tasks due today\n"
		"- 'Show overdue tasks' → Filter by overdue\n\n"
		"**Response Formatting:**\n"
		"When presenting task information, always format it clearly:\n"
		"- Use emojis to represent status (📋 Backlog, 📝 Todo, 🔄 In Progress, ✅ Done, ❌ Canceled)\n"
		"- Use priority emojis (🔥 Urgent, ⬆️ High, ➡️ Medium, ⬇️ Low)\n"
		"- Include due dates with 📅 emoji\n"
		"- Show project names with 📁 emoji\n"
		"- Display task counts and summaries prominently\n"
		"- Group related information logically\n"
		"- Include task IDs for reference when relevant\n\n"
		"Always use the appropriate tools to accomplish the user's request. "
		"Don't ask for permission - execute the task management actions directly. "
		"Be proactive in understanding task-related requests and provide helpful, "
		"organized responses with clear summaries.\n\n"
		"Keep your responses clear, actionable, and focused on helping users "
		"stay organized and productive."
	)


def build_gameplan_context(message: str) -> str:
	"""Build context from current user's Gameplan data"""
	context_parts = []

	try:
		# Add current date and time
		from datetime import datetime

		current_date = datetime.now().strftime("%Y-%m-%d")
		current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
		context_parts.append(f"Current date: {current_date}")
		context_parts.append(f"Current date and time: {current_datetime}")

		# Add current user
		user = frappe.session.user
		user_doc = frappe.get_doc("User", user)
		context_parts.append(f"Current user: {user_doc.full_name or user}")
		context_parts.append(f"Current user email: {user}")

	except Exception as e:
		frappe.log_error(f"Error building context: {str(e)}", "Juno Context")
		context_parts.append("Context temporarily unavailable")

	return "\n".join(context_parts) if context_parts else "No specific context available"


def model_supports_tools(model: str, base_url: str) -> bool:
	"""Check if a model supports tool calling"""
	tool_supporting_models = ["qwen", "llama3", "gemma"]
	model_name_lower = model.lower()

	for supported_model in tool_supporting_models:
		if supported_model in model_name_lower:
			return True

	return False


def call_ollama_streaming_api(messages: list[dict], model: str, base_url: str, tools: list[dict] = None):
	"""Make streaming API call to Ollama backend with native tool call support"""
	try:
		url = f"{base_url}/api/chat"

		payload = {
			"model": model,
			"messages": messages,
			"stream": True,
			"options": {"temperature": 0.7, "top_p": 0.9, "num_predict": 2000},
		}

		if tools and model_supports_tools(model, base_url):
			payload["tools"] = tools

		headers = {"Content-Type": "application/json"}
		timeout = get_ollama_config().get("timeout", 120)

		response = requests.post(
			url,
			json=payload,
			headers=headers,
			timeout=timeout,
			stream=True,
		)

		response.raise_for_status()

		for line in response.iter_lines():
			if line:
				try:
					chunk_data = json.loads(line.decode("utf-8"))

					if chunk_data.get("message"):
						message = chunk_data.get("message", {})

						if message.get("content"):
							yield {
								"type": "content",
								"content": message.get("content", ""),
								"done": chunk_data.get("done", False),
							}

						if message.get("tool_calls"):
							tool_calls = message.get("tool_calls", [])
							converted_tool_calls = []
							for tool_call in tool_calls:
								function = tool_call.get("function", {})
								arguments = function.get("arguments", "{}")
								if isinstance(arguments, str):
									arguments = json.loads(arguments)
								elif not isinstance(arguments, dict):
									arguments = {}

								converted_call = {
									"id": tool_call.get("id"),
									"name": function.get("name"),
									"arguments": arguments,
								}
								converted_tool_calls.append(converted_call)

							yield {"type": "tool_calls", "tool_calls": converted_tool_calls}

					elif chunk_data.get("done"):
						break

				except json.JSONDecodeError:
					continue
				except Exception as e:
					frappe.log_error(f"Streaming parse error: {str(e)}", "Juno AI")
					continue

	except requests.exceptions.Timeout:
		frappe.log_error("Ollama streaming timeout", "Juno AI")
		yield {"type": "error", "error": "AI response timed out. Please try again."}
	except requests.exceptions.ConnectionError as e:
		frappe.log_error(f"Ollama connection error: {str(e)}", "Juno AI")
		yield {"type": "error", "error": "Cannot connect to AI service. Please check if Ollama is running."}
	except requests.exceptions.RequestException as e:
		frappe.log_error(f"Ollama request error: {str(e)}", "Juno AI")
		yield {"type": "error", "error": f"AI service error: {str(e)}"}
	except Exception as e:
		frappe.log_error(f"Ollama streaming unexpected error: {str(e)}", "Juno AI")
		yield {"type": "error", "error": f"Unexpected error: {str(e)}"}


@frappe.whitelist()
def get_streaming_response(
	message: str,
	conversation_id: str | None = None,
	model: str | None = None,
	conversation_history: str | None = None,
):
	"""Generate streaming AI response using Ollama backend with MCP tool calling support"""
	try:
		ollama_config = get_ollama_config()
		selected_model = model or ollama_config.get("model", "qwen3:latest")

		context = build_gameplan_context(message)

		messages = []
		if conversation_history:
			try:
				parsed_history = json.loads(conversation_history)
				if isinstance(parsed_history, list):
					messages = parsed_history
			except (json.JSONDecodeError, TypeError):
				pass

		system_prompt = get_system_prompt()
		if context:
			system_prompt += f"\n\nContext:\n{context}"

		mcp_tools = _get_mcp_tools()
		ollama_tools = convert_mcp_tools_to_ollama_format(mcp_tools) if mcp_tools else []

		if ollama_tools:
			system_prompt = enhance_prompt_with_mcp_tools(system_prompt)

		if not messages or messages[0].get("role") != "system":
			messages.insert(0, {"role": "system", "content": system_prompt})

		messages.append({"role": "user", "content": message})

		def generate_stream():
			try:
				stream_complete = False
				current_messages = messages.copy()  # Work with a copy of messages

				for chunk in call_ollama_streaming_api(
					messages=current_messages,
					model=selected_model,
					base_url=ollama_config.get("base_url", "http://localhost:11434"),
					tools=ollama_tools,
				):
					if chunk.get("type") == "tool_calls":
						tool_calls = chunk.get("tool_calls", [])

						# Build tool results for continuing the conversation
						tool_results = []

						for tool_call in tool_calls:
							try:
								# Emit tool_call_start event
								yield f"data: {json.dumps({'type': 'tool_call_start', 'tool_call': tool_call})}\n\n"

								# Execute the tool
								result = execute_mcp_tool_call(tool_call)
								formatted_result = format_tool_result_for_ai(result)

								# Emit tool_call_result event
								yield f"data: {json.dumps({'type': 'tool_call_result', 'result': formatted_result})}\n\n"

								# Emit tool_call_end event
								yield f"data: {json.dumps({'type': 'tool_call_end'})}\n\n"

								# Collect tool result for LLM continuation
								tool_results.append(
									{
										"tool_call_id": tool_call.get("id"),
										"role": "tool",
										"content": formatted_result,
									}
								)

							except Exception as e:
								error_msg = f"Tool execution error: {str(e)}"
								yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"

								# Add error as tool result
								tool_results.append(
									{
										"tool_call_id": tool_call.get("id"),
										"role": "tool",
										"content": f"Error: {error_msg}",
									}
								)

						# If we have tool results, continue the conversation
						if tool_results:
							# Add the assistant message with tool calls
							current_messages.append({"role": "assistant", "tool_calls": tool_calls})

							# Add tool results
							for tool_result in tool_results:
								current_messages.append(tool_result)

							# Continue the conversation to let LLM format the results
							for continuation_chunk in call_ollama_streaming_api(
								messages=current_messages,
								model=selected_model,
								base_url=ollama_config.get("base_url", "http://localhost:11434"),
								tools=ollama_tools,
							):
								if continuation_chunk.get("type") == "content":
									# Pass through all content, including thinking tokens
									content = continuation_chunk.get("content", "")

									# Check if this is thinking content
									if any(
										pattern in content
										for pattern in ["<think>", "</think>", "<thinking>", "</thinking>"]
									):
										# Pass thinking tokens with a special type
										thinking_chunk = {
											"type": "thinking",
											"content": content,
											"done": continuation_chunk.get("done", False),
										}
										yield f"data: {json.dumps(thinking_chunk)}\n\n"
									else:
										# Regular content
										yield f"data: {json.dumps(continuation_chunk)}\n\n"

									# Check if this chunk indicates completion
									if continuation_chunk.get("done"):
										stream_complete = True
										break
								elif continuation_chunk.get("type") == "tool_calls":
									# Handle nested tool calls if needed (though rare)
									# For now, just pass through
									yield f"data: {json.dumps(continuation_chunk)}\n\n"
								else:
									# Pass through other chunk types
									yield f"data: {json.dumps(continuation_chunk)}\n\n"
									if (
										continuation_chunk.get("done")
										or continuation_chunk.get("type") == "error"
									):
										stream_complete = True
										break
					elif chunk.get("type") == "content":
						# Pass through all content, including thinking tokens
						content = chunk.get("content", "")

						# Check if this is thinking content
						if any(
							pattern in content
							for pattern in ["<think>", "</think>", "<thinking>", "</thinking>"]
						):
							# Pass thinking tokens with a special type
							thinking_chunk = {
								"type": "thinking",
								"content": content,
								"done": chunk.get("done", False),
							}
							yield f"data: {json.dumps(thinking_chunk)}\n\n"
						else:
							# Regular content
							yield f"data: {json.dumps(chunk)}\n\n"

						# Check if this chunk indicates completion
						if chunk.get("done"):
							stream_complete = True
					else:
						# Pass through other chunk types (error, etc.)
						yield f"data: {json.dumps(chunk)}\n\n"

						# Check if this chunk indicates completion
						if chunk.get("done") or chunk.get("type") == "error":
							stream_complete = True

				# Ensure we send a done event if not already sent
				if not stream_complete:
					yield f"data: {json.dumps({'type': 'done'})}\n\n"

			except Exception as e:
				error_response = {"type": "error", "error": str(e)}
				yield f"data: {json.dumps(error_response)}\n\n"

		return Response(
			generate_stream(),
			mimetype="text/event-stream",
			headers={
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		)

	except Exception as e:
		frappe.log_error(f"Streaming response error: {str(e)}", "Juno AI")
		error_stream = f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
		return Response(
			error_stream,
			mimetype="text/event-stream",
			headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
		)


@frappe.whitelist()
def get_available_models() -> list[str]:
	"""Get list of available Ollama models"""
	try:
		config = get_ollama_config()
		base_url = config.get("base_url", "http://localhost:11434")

		response = requests.get(f"{base_url}/api/tags", timeout=30)
		response.raise_for_status()

		data = response.json()
		models = [model.get("name", "") for model in data.get("models", [])]
		return models
	except Exception as e:
		frappe.log_error(f"Failed to get available models: {str(e)}", "Juno AI")
		return []


@frappe.whitelist()
def test_ollama_connection() -> dict[str, Any]:
	"""Test Ollama connection (used by UI)"""
	try:
		config = get_ollama_config()
		base_url = config.get("base_url", "http://localhost:11434")

		# Test basic connection
		response = requests.get(f"{base_url}/api/tags", timeout=10)
		response.raise_for_status()

		# Get available models
		models = get_available_models()

		return {
			"success": True,
			"base_url": base_url,
			"status": "connected",
			"models_count": len(models),
			"models": models[:5],  # First 5 models for UI display
		}
	except requests.exceptions.ConnectionError:
		return {
			"success": False,
			"error": "Cannot connect to Ollama. Please check if Ollama is running.",
			"base_url": get_ollama_config().get("base_url", "http://localhost:11434"),
		}
	except Exception as e:
		return {
			"success": False,
			"error": str(e),
			"base_url": get_ollama_config().get("base_url", "http://localhost:11434"),
		}


def get_mcp_servers_config() -> dict[str, dict[str, Any]]:
	"""Get MCP servers configuration from site config"""
	try:
		config = frappe.get_site_config()
		return config.get("mcp_servers", {})
	except Exception:
		return {}


def get_mcp_client():
	"""Get MCP client instance"""
	from .mcp_client import get_mcp_client

	return get_mcp_client()


def get_active_mcp_client():
	"""Get the active MCP client (for compatibility)"""
	return get_mcp_client()


def _setup_mcp_servers() -> dict[str, Any]:
	"""Setup MCP servers"""
	try:
		client = get_mcp_client()
		if client.connect():
			return {"success": True, "message": "MCP servers connected"}
		else:
			return {"success": False, "error": "Failed to connect to MCP servers"}
	except Exception as e:
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def setup_mcp_servers():
	"""Setup MCP servers (API endpoint)"""
	return _setup_mcp_servers()


def _get_mcp_tools() -> list[dict[str, Any]]:
	"""Get tools from MCP servers"""
	try:
		client = get_mcp_client()
		mcp_tools = client.list_tools()
	except Exception as e:
		frappe.log_error(f"Failed to get MCP tools: {str(e)}", "Juno AI")
		mcp_tools = []

	# Add built-in task management tools
	task_tools = _get_task_tools()
	return mcp_tools + task_tools


def _get_task_tools() -> list[dict[str, Any]]:
	"""Get built-in task management tools"""
	return [
		{
			"name": "get_user_tasks",
			"description": "Get tasks for the current user with optional filters for status, priority, project, due date, etc.",
			"server": "gameplan",
			"input_schema": {
				"type": "object",
				"properties": {
					"status": {
						"type": "string",
						"description": "Filter by status (Backlog, Todo, In Progress, Done, Canceled)",
					},
					"priority": {
						"type": "string",
						"description": "Filter by priority (Urgent, High, Medium, Low)",
					},
					"project": {"type": "string", "description": "Filter by project name"},
					"assigned_to": {"type": "string", "description": "Filter by assigned user email"},
					"due_date_filter": {
						"type": "string",
						"description": "Filter by due date (today, tomorrow, this_week, overdue)",
					},
					"limit": {
						"type": "integer",
						"description": "Maximum number of tasks to return (default: 20)",
					},
				},
			},
		},
		{
			"name": "create_task",
			"description": "Create a new task with title, description, status, priority, due date, etc.",
			"server": "gameplan",
			"input_schema": {
				"type": "object",
				"required": ["title"],
				"properties": {
					"title": {"type": "string", "description": "Task title (required)"},
					"description": {"type": "string", "description": "Task description"},
					"status": {
						"type": "string",
						"description": "Task status (Backlog, Todo, In Progress, Done, Canceled)",
					},
					"priority": {
						"type": "string",
						"description": "Task priority (Urgent, High, Medium, Low)",
					},
					"due_date": {
						"type": "string",
						"description": "Due date in YYYY-MM-DD format or natural language (today, tomorrow, etc.)",
					},
					"start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format"},
					"project": {"type": "string", "description": "Project name or ID"},
					"assigned_to": {
						"type": "string",
						"description": "User email to assign the task to. Leave empty to assign to current user. Use actual user emails like admin@example.com or names that exist in the system.",
					},
				},
			},
		},
		{
			"name": "update_task",
			"description": "Update an existing task by ID or title",
			"server": "gameplan",
			"input_schema": {
				"type": "object",
				"required": ["task_identifier"],
				"properties": {
					"task_identifier": {
						"type": "string",
						"description": "Task ID or title to identify the task",
					},
					"title": {"type": "string", "description": "New task title"},
					"description": {"type": "string", "description": "New task description"},
					"status": {"type": "string", "description": "New task status"},
					"priority": {"type": "string", "description": "New task priority"},
					"due_date": {"type": "string", "description": "New due date"},
					"start_date": {"type": "string", "description": "New start date"},
					"project": {"type": "string", "description": "New project"},
					"assigned_to": {"type": "string", "description": "New assignee email"},
				},
			},
		},
		{
			"name": "search_tasks",
			"description": "Search tasks by title or description",
			"server": "gameplan",
			"input_schema": {
				"type": "object",
				"required": ["query"],
				"properties": {
					"query": {"type": "string", "description": "Search query string"},
					"limit": {"type": "integer", "description": "Maximum number of results (default: 10)"},
				},
			},
		},
		{
			"name": "get_task_summary",
			"description": "Get a summary of current user's tasks including counts by status, overdue tasks, etc.",
			"server": "gameplan",
			"input_schema": {"type": "object", "properties": {}},
		},
	]


@frappe.whitelist()
def get_mcp_tools():
	"""Get MCP tools (API endpoint)"""
	return _get_mcp_tools()


@frappe.whitelist()
def get_mcp_servers():
	"""Get MCP servers configuration and status"""
	try:
		servers_config = get_mcp_servers_config()
		client = get_mcp_client()
		status = client.get_status()

		servers_info = {}
		for server_name, config in servers_config.items():
			servers_info[server_name] = {
				"enabled": config.get("enabled", True),
				"command": config.get("command", ""),
				"description": config.get("description", ""),
			}

		return {
			"servers": servers_info,
			"status": status,
			"total_servers": len(servers_config),
			"active_servers": status.get("active_servers", []),
		}

	except Exception as e:
		frappe.log_error(f"Failed to get MCP servers: {str(e)}", "Juno AI")
		return {
			"servers": {},
			"status": {"error": str(e)},
			"total_servers": 0,
			"active_servers": [],
		}


@frappe.whitelist()
def get_mcp_servers_and_tools():
	"""Get comprehensive MCP information"""
	try:
		servers_config = get_mcp_servers_config()
		client = get_mcp_client()

		# Ensure the client is connected
		if not client.is_ready():
			client.connect()

		status = client.get_status()
		tools = client.list_tools()

		tools_by_server = {}
		for tool in tools:
			server_name = tool.get("server", "unknown")
			if server_name not in tools_by_server:
				tools_by_server[server_name] = []
			tools_by_server[server_name].append(
				{
					"name": tool.get("name", ""),
					"description": tool.get("description", ""),
					"full_name": tool.get("full_name", tool.get("name", "")),
				}
			)

		servers_info = {}
		for server_name, config in servers_config.items():
			servers_info[server_name] = {
				"enabled": config.get("enabled", True),
				"command": config.get("command", ""),
				"description": config.get("description", ""),
				"tools": tools_by_server.get(server_name, []),
				"tools_count": len(tools_by_server.get(server_name, [])),
			}

		return {
			"servers": servers_info,
			"status": status,
			"total_servers": len(servers_config),
			"total_tools": len(tools),
			"active_servers": status.get("active_servers", []),
			"tools_by_server": tools_by_server,
		}

	except Exception as e:
		frappe.log_error(f"Failed to get MCP servers and tools: {str(e)}", "Juno AI")
		return {
			"servers": {},
			"status": {"error": str(e)},
			"total_servers": 0,
			"total_tools": 0,
			"active_servers": [],
			"tools_by_server": {},
		}


def enhance_prompt_with_mcp_tools(base_prompt: str) -> str:
	"""Enhance system prompt with information about available MCP tools"""
	try:
		mcp_tools = _get_mcp_tools()
		if not mcp_tools:
			return base_prompt

		tools_by_server = {}
		for tool in mcp_tools:
			server = tool.get("server", "unknown")
			if server not in tools_by_server:
				tools_by_server[server] = []
			tools_by_server[server].append(
				{
					"name": tool.get("name", ""),
					"description": tool.get("description", "No description available"),
				}
			)

		enhanced_prompt = base_prompt + "\n\nYou have access to the following tools:\n\n"

		for server_name, tools in tools_by_server.items():
			enhanced_prompt += f"## {server_name.title()} Tools:\n"
			for tool in tools:
				tool_name = tool["name"]
				tool_desc = tool["description"]
				enhanced_prompt += f"- **{server_name}.{tool_name}**: {tool_desc}\n"
			enhanced_prompt += "\n"

		enhanced_prompt += (
			"To use a tool, format your function call as: server_name.tool_name\n"
			"For example: gameplan.get_user_tasks or google_calendar.list_calendars\n\n"
			"Always use tools when they can help accomplish the user's request. "
			"Don't ask for permission - use the appropriate tools directly.\n"
		)

		return enhanced_prompt

	except Exception as e:
		frappe.log_error(f"Failed to enhance prompt with MCP tools: {str(e)}", "Juno AI")
		return base_prompt


def execute_mcp_tool_call(tool_call: dict[str, Any]) -> dict[str, Any]:
	"""Execute an MCP tool call (includes built-in task tools)"""
	try:
		function_name = tool_call.get("name", "")
		arguments = tool_call.get("arguments", {})

		if "." not in function_name:
			return {"error": "Invalid tool name format. Expected format: server.tool"}

		server, tool = function_name.split(".", 1)

		# Handle built-in gameplan task tools
		if server == "gameplan":
			return _execute_task_tool(tool, arguments)

		# Handle MCP server tools
		client = get_mcp_client()
		result = client.call_tool(server, tool, arguments)
		return result

	except Exception as e:
		frappe.log_error(f"Tool call failed: {str(e)}", "Juno AI")
		return {"error": str(e)}


def _execute_task_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
	"""Execute built-in task management tools"""
	try:
		if tool_name == "get_user_tasks":
			return GPTaskTools.get_user_tasks(**arguments)
		elif tool_name == "create_task":
			return GPTaskTools.create_task(**arguments)
		elif tool_name == "update_task":
			return GPTaskTools.update_task(**arguments)
		elif tool_name == "search_tasks":
			return GPTaskTools.search_tasks(**arguments)
		elif tool_name == "get_task_summary":
			return GPTaskTools.get_task_summary()
		else:
			return {"error": f"Unknown task tool: {tool_name}"}
	except Exception as e:
		frappe.log_error(f"Task tool execution failed: {str(e)}", "Juno Task Tools")
		return {"error": str(e)}


def convert_mcp_tools_to_ollama_format(mcp_tools: list[dict]) -> list[dict]:
	"""Convert MCP tools to Ollama tool format"""
	ollama_tools = []

	for tool in mcp_tools:
		server = tool.get("server", "")
		name = tool.get("name", "")
		description = tool.get("description", "")
		input_schema = tool.get("input_schema", {})

		ollama_tool = {
			"type": "function",
			"function": {"name": f"{server}.{name}", "description": description, "parameters": input_schema},
		}
		ollama_tools.append(ollama_tool)

	return ollama_tools


def execute_ollama_tool_call(tool_call: dict[str, Any]) -> dict[str, Any]:
	"""Execute an Ollama-formatted tool call"""
	try:
		function = tool_call.get("function", {})
		function_name = function.get("name", "")
		arguments = function.get("arguments", {})

		if "." not in function_name:
			return {"error": "Invalid tool name format. Expected format: server.tool"}

		server, tool = function_name.split(".", 1)

		client = get_mcp_client()
		result = client.call_tool(server, tool, arguments)
		return result

	except Exception as e:
		frappe.log_error(f"Ollama tool call failed: {str(e)}", "Juno AI")
		return {"error": str(e)}


def parse_tool_calls_from_response(response_text: str) -> list[dict[str, Any]]:
	"""Parse tool calls from AI response text"""
	tool_calls = []

	pattern = r"(\w+)\.(\w+)\((.*?)\)"
	matches = re.finditer(pattern, response_text)

	for match in matches:
		server = match.group(1)
		tool = match.group(2)
		args_str = match.group(3)

		try:
			if args_str.strip():
				if args_str.strip().startswith("{") and args_str.strip().endswith("}"):
					arguments = json.loads(args_str)
				else:
					arguments = {}
					for arg_pair in args_str.split(","):
						if "=" in arg_pair:
							key, value = arg_pair.split("=", 1)
							key = key.strip().strip("\"'")
							value = value.strip().strip("\"'")
							arguments[key] = value
			else:
				arguments = {}
		except (json.JSONDecodeError, ValueError):
			arguments = {}

		tool_call = {"name": f"{server}.{tool}", "arguments": arguments}
		tool_calls.append(tool_call)

	return tool_calls


@frappe.whitelist()
def get_mcp_config():
	"""Get MCP configuration"""
	return {"servers": get_mcp_servers_config(), "client_status": get_mcp_client().get_status()}


@frappe.whitelist()
def test_mcp_setup():
	"""Test MCP setup (used by UI)"""
	try:
		client = get_mcp_client()

		# Test connection
		success = client.connect()

		if not success:
			return {"success": False, "error": "Failed to connect to MCP client"}

		# Get status and tools
		status = client.get_status()
		tools = client.list_tools()

		return {
			"success": True,
			"status": status,
			"tools_count": len(tools),
			"servers_connected": status.get("servers_connected", 0),
			"ready": client.is_ready(),
			"tools": tools[:5] if tools else [],  # First 5 tools for UI
		}

	except Exception as e:
		frappe.log_error(f"MCP setup test failed: {str(e)}", "Juno AI")
		return {"success": False, "error": str(e)}


def format_tool_result_for_ai(tool_result: dict[str, Any]) -> str:
	"""Format tool execution result for AI consumption"""
	if tool_result.get("error"):
		return f"❌ **Error:** {tool_result['error']}"

	# Handle task management results with better formatting
	if tool_result.get("success") and "tasks" in tool_result:
		return format_task_results(tool_result)
	elif tool_result.get("success") and "summary" in tool_result:
		return format_task_summary(tool_result)
	elif tool_result.get("success") and "task" in tool_result:
		return format_single_task_result(tool_result)

	# Handle other successful results with nice formatting
	elif tool_result.get("success"):
		formatted_output = []

		# Add success message if present
		if tool_result.get("message"):
			formatted_output.append(f"✅ {tool_result['message']}")
			formatted_output.append("")

		# Display key information
		important_keys = ["status", "count", "total", "results", "data", "items"]
		for key in important_keys:
			if key in tool_result and tool_result[key] is not None:
				if isinstance(tool_result[key], (int, float)):
					formatted_output.append(f"📊 **{key.title()}:** {tool_result[key]}")
				elif isinstance(tool_result[key], str):
					formatted_output.append(f"📋 **{key.title()}:** {tool_result[key]}")
				elif isinstance(tool_result[key], list) and len(tool_result[key]) > 0:
					formatted_output.append(f"📄 **{key.title()}:** {len(tool_result[key])} items")

		# Add other relevant information
		system_keys = {"success", "message", "error", "status", "count", "total", "results", "data", "items"}
		other_info = []
		for key, value in tool_result.items():
			if key not in system_keys and value is not None:
				if isinstance(value, (str, int, float, bool)):
					other_info.append(f"• **{key.replace('_', ' ').title()}:** {value}")

		if other_info:
			if formatted_output:
				formatted_output.append("")
			formatted_output.append("**Additional Information:**")
			formatted_output.extend(other_info)

		return "\n".join(formatted_output) if formatted_output else "✅ Operation completed successfully"

	# Handle MCP tool results with better formatting
	content = tool_result.get("content", [])
	if isinstance(content, list) and content:
		formatted_output = []
		for item in content:
			if isinstance(item, dict):
				if item.get("type") == "text":
					text = item.get("text", "")
					if text:
						formatted_output.append(text)
				elif item.get("type") == "image":
					formatted_output.append(f"🖼️ **Image:** {item.get('alt', 'Image content')}")
				else:
					formatted_output.append(str(item))
			else:
				formatted_output.append(str(item))

		result = "\n".join(formatted_output)
		return result if result else "📄 Content retrieved successfully"

	# Enhanced fallback for better formatting of any other results
	if isinstance(tool_result, str):
		if not tool_result.strip():
			return "📄 Empty result"
		if len(tool_result) > 500:
			return f"📄 **Result Preview:**\n{tool_result[:200]}...\n\n💡 *Full result available (total: {len(tool_result)} characters)*"
		return f"📄 **Result:**\n{tool_result}"

	if isinstance(tool_result, dict) and tool_result:
		formatted_output = []
		for key, value in tool_result.items():
			if isinstance(value, (str, int, float, bool)):
				emoji = "📋" if isinstance(value, str) else "📊"
				formatted_output.append(f"{emoji} **{key.replace('_', ' ').title()}:** {value}")
			elif isinstance(value, list) and len(value) > 0:
				formatted_output.append(f"📄 **{key.replace('_', ' ').title()}:** {len(value)} items")
			elif isinstance(value, dict) and value:
				formatted_output.append(
					f"📁 **{key.replace('_', ' ').title()}:** Object with {len(value)} properties"
				)
		return "\n".join(formatted_output) if formatted_output else "📄 Result data available"

	# Final fallback with better presentation
	return f"📄 **Result:** {str(tool_result)}" if tool_result is not None else "📄 No result returned"


def format_task_results(result: dict[str, Any]) -> str:
	"""Format task list results for better AI presentation"""
	if not result.get("success"):
		return f"Error: {result.get('error', 'Unknown error')}"

	tasks = result.get("tasks", [])
	count = result.get("count", 0)
	filters = result.get("filters_applied", {})

	if count == 0:
		filter_desc = ""
		if filters:
			filter_parts = []
			if filters.get("status"):
				filter_parts.append(f"status: {filters['status']}")
			if filters.get("priority"):
				filter_parts.append(f"priority: {filters['priority']}")
			if filters.get("due_date_filter"):
				filter_parts.append(f"due date: {filters['due_date_filter']}")
			if filter_parts:
				filter_desc = f" (with filters: {', '.join(filter_parts)})"
		return f"No tasks found{filter_desc}."

	# Format tasks nicely
	formatted_output = []
	formatted_output.append(f"Found {count} task{'s' if count != 1 else ''}:")
	formatted_output.append("")

	for i, task in enumerate(tasks, 1):
		task_line = f"{i}. **{task.get('title', 'Untitled Task')}**"

		# Add status with emoji
		status = task.get("status", "Unknown")
		status_emoji = {
			"Backlog": "📋",
			"Todo": "📝",
			"In Progress": "🔄",
			"Done": "✅",
			"Canceled": "❌",
		}.get(status, "📌")
		task_line += f" {status_emoji} {status}"

		# Add priority if set
		if task.get("priority"):
			priority_emoji = {"Urgent": "🔥", "High": "⬆️", "Medium": "➡️", "Low": "⬇️"}.get(
				task.get("priority"), ""
			)
			task_line += f" {priority_emoji} {task['priority']}"

		# Add due date if set
		if task.get("due_date"):
			due_date = task["due_date"]
			if isinstance(due_date, str):
				task_line += f" 📅 Due: {due_date}"

		formatted_output.append(task_line)

		# Add description if present (truncated)
		if task.get("description"):
			desc = task["description"]
			if len(desc) > 100:
				desc = desc[:100] + "..."
			formatted_output.append(f"   {desc}")

		# Add project if present
		if task.get("project_title"):
			formatted_output.append(f"   📁 Project: {task['project_title']}")

		# Add task ID for reference
		formatted_output.append(f"   🔗 ID: {task.get('name', 'N/A')}")
		formatted_output.append("")

	return "\n".join(formatted_output)


def format_task_summary(result: dict[str, Any]) -> str:
	"""Format task summary for better AI presentation"""
	if not result.get("success"):
		return f"Error: {result.get('error', 'Unknown error')}"

	summary = result.get("summary", {})
	status_counts = summary.get("status_counts", {})

	formatted_output = []
	formatted_output.append("📊 **Task Summary**")
	formatted_output.append("")

	# Status breakdown
	formatted_output.append("**Status Breakdown:**")
	formatted_output.append(f"📋 Backlog: {status_counts.get('backlog', 0)}")
	formatted_output.append(f"📝 Todo: {status_counts.get('todo', 0)}")
	formatted_output.append(f"🔄 In Progress: {status_counts.get('in_progress', 0)}")
	formatted_output.append(f"✅ Done: {status_counts.get('done', 0)}")
	formatted_output.append(f"❌ Canceled: {status_counts.get('canceled', 0)}")
	formatted_output.append("")

	# Key metrics
	total_active = summary.get("total_active", 0)
	overdue_count = summary.get("overdue_count", 0)
	due_today_count = summary.get("due_today_count", 0)

	formatted_output.append("**Key Metrics:**")
	formatted_output.append(f"🎯 Active Tasks: {total_active}")
	if due_today_count > 0:
		formatted_output.append(f"📅 Due Today: {due_today_count}")
	if overdue_count > 0:
		formatted_output.append(f"⚠️ Overdue: {overdue_count}")

	# Recent tasks
	recent_tasks = summary.get("recent_tasks", [])
	if recent_tasks:
		formatted_output.append("")
		formatted_output.append("**Recent Tasks:**")
		for task in recent_tasks[:3]:  # Show top 3
			status_emoji = {
				"Backlog": "📋",
				"Todo": "📝",
				"In Progress": "🔄",
				"Done": "✅",
				"Canceled": "❌",
			}.get(task.get("status", ""), "📌")
			formatted_output.append(f"• {task.get('title', 'Untitled')} {status_emoji}")

	return "\n".join(formatted_output)


def format_single_task_result(result: dict[str, Any]) -> str:
	"""Format single task operation result"""
	if not result.get("success"):
		return f"Error: {result.get('error', 'Unknown error')}"

	message = result.get("message", "")
	task = result.get("task", {})
	changes = result.get("changes", [])

	formatted_output = []

	if message:
		formatted_output.append(f"✅ {message}")
		formatted_output.append("")

	if task:
		formatted_output.append("**📋 Task Details:**")
		formatted_output.append("")

		# Title with status
		title_line = f"**{task.get('title', 'N/A')}**"
		if task.get("status"):
			status_emoji = {
				"Backlog": "📋",
				"Todo": "📝",
				"In Progress": "🔄",
				"Done": "✅",
				"Canceled": "❌",
			}.get(task.get("status"), "📌")
			title_line += f" {status_emoji} {task['status']}"
		formatted_output.append(title_line)
		formatted_output.append("")

		# Priority
		if task.get("priority"):
			priority_emoji = {"Urgent": "🔥", "High": "⬆️", "Medium": "➡️", "Low": "⬇️"}.get(
				task.get("priority"), ""
			)
			formatted_output.append(f"**Priority:** {priority_emoji} {task['priority']}")

		# Dates
		if task.get("due_date"):
			formatted_output.append(f"**Due Date:** 📅 {task['due_date']}")

		if task.get("start_date"):
			formatted_output.append(f"**Start Date:** 📅 {task['start_date']}")

		# Assignment
		if task.get("assigned_to"):
			assignee_display = task.get("assigned_to_name", task["assigned_to"])
			formatted_output.append(f"**Assigned To:** 👤 {assignee_display}")

		# Project
		if task.get("project"):
			project_display = task.get("project_title", task["project"])
			formatted_output.append(f"**Project:** 📁 {project_display}")

		# Description
		if task.get("description"):
			description = task["description"]
			if len(description) > 200:
				description = description[:200] + "..."
			formatted_output.append("")
			formatted_output.append(f"**Description:**")
			formatted_output.append(f"{description}")

		# Additional info
		formatted_output.append("")
		formatted_output.append("**Additional Info:**")

		if task.get("is_completed"):
			completed_at = task.get("completed_at", "Unknown")
			formatted_output.append(f"✅ Completed at: {completed_at}")

		if task.get("comments_count"):
			formatted_output.append(f"💬 Comments: {task['comments_count']}")

		formatted_output.append(f"🔗 Task ID: {task.get('name', 'N/A')}")

		if task.get("modified"):
			formatted_output.append(f"📝 Last Modified: {task['modified']}")

	if changes:
		formatted_output.append("")
		formatted_output.append("**🔄 Changes Made:**")
		for change in changes:
			formatted_output.append(f"• {change}")

	return "\n".join(formatted_output)


@frappe.whitelist()
def get_mcp_status():
	"""Get MCP status (used by UI)"""
	try:
		# Check if MCP servers are configured
		servers_config = get_mcp_servers_config()
		if not servers_config:
			return {
				"connected": False,
				"client_type": "ReliableFastMCP",
				"servers_configured": 0,
				"servers_connected": 0,
				"tools_available": 0,
				"active_servers": [],
				"available_servers": [],
				"error": "No MCP servers configured in site_config.json",
			}

		client = get_mcp_client()

		# Ensure the client is connected
		if not client.is_ready():
			client.connect()

		status = client.get_status()

		# Ensure all required fields are present
		return {
			"connected": status.get("connected", False),
			"client_type": status.get("client_type", "ReliableFastMCP"),
			"servers_configured": status.get("servers_configured", 0),
			"servers_connected": status.get("servers_connected", 0),
			"tools_available": status.get("tools_available", 0),
			"active_servers": status.get("active_servers", []),
			"available_servers": status.get("available_servers", []),
		}
	except Exception as e:
		frappe.log_error(f"Failed to get MCP status: {str(e)}", "Juno AI")
		return {
			"connected": False,
			"error": str(e),
			"client_type": "ReliableFastMCP",
			"servers_configured": 0,
			"servers_connected": 0,
			"tools_available": 0,
			"active_servers": [],
			"available_servers": [],
		}


# Task management API endpoints
@frappe.whitelist()
def test_task_integration():
	"""Test task management integration"""
	try:
		# Test getting task summary
		summary = GPTaskTools.get_task_summary()

		# Test getting all available tools
		all_tools = _get_mcp_tools()
		task_tools = [tool for tool in all_tools if tool.get("server") == "gameplan"]

		return {
			"success": True,
			"task_summary": summary,
			"available_task_tools": len(task_tools),
			"task_tools": [tool["name"] for tool in task_tools],
			"message": "Task management integration is working!",
		}
	except Exception as e:
		frappe.log_error(f"Task integration test failed: {str(e)}", "Juno AI")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def test_task_formatting():
	"""Test task formatting with sample data"""
	try:
		# Get some real tasks
		tasks_result = GPTaskTools.get_user_tasks(limit=5)

		# Format the result
		formatted_result = format_tool_result_for_ai(tasks_result)

		# Also get summary
		summary_result = GPTaskTools.get_task_summary()
		formatted_summary = format_tool_result_for_ai(summary_result)

		return {
			"success": True,
			"raw_tasks": tasks_result,
			"formatted_tasks": formatted_result,
			"raw_summary": summary_result,
			"formatted_summary": formatted_summary,
			"message": "Task formatting test completed!",
		}
	except Exception as e:
		frappe.log_error(f"Task formatting test failed: {str(e)}", "Juno AI")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def test_task_update_formatting():
	"""Test task update formatting with sample data"""
	try:
		# Create a sample task result that would come from an update operation
		sample_update_result = {
			"success": True,
			"task": {
				"name": "TASK-00123",
				"title": "Review Authentication System PR",
				"description": "Complete review of the new authentication system implementation including security audit and code quality check.",
				"status": "In Progress",
				"priority": "High",
				"due_date": "2025-01-16",
				"start_date": "2025-01-14",
				"assigned_to": "john.doe@example.com",
				"assigned_to_name": "John Doe",
				"project": "PRJ-AUTH-001",
				"project_title": "Authentication System Upgrade",
				"is_completed": False,
				"completed_at": None,
				"comments_count": 3,
				"creation": "2025-01-13 10:30:00",
				"modified": "2025-01-13 15:45:00",
			},
			"changes": ["status to 'In Progress'", "priority to 'High'", "due date to '2025-01-16'"],
			"message": "Task 'Review Authentication System PR' updated successfully",
		}

		# Format the result
		formatted_result = format_tool_result_for_ai(sample_update_result)

		return {
			"success": True,
			"raw_update_result": sample_update_result,
			"formatted_update_result": formatted_result,
			"message": "Task update formatting test completed!",
		}
	except Exception as e:
		frappe.log_error(f"Task update formatting test failed: {str(e)}", "Juno AI")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def test_comprehensive_formatting():
	"""Test comprehensive formatting with various result types"""
	try:
		# Test different types of results to show formatting works
		test_results = []

		# Test 1: Generic success result
		generic_result = {
			"success": True,
			"message": "Operation completed successfully",
			"count": 5,
			"status": "active",
			"results": ["item1", "item2", "item3"],
			"additional_info": "Some extra data",
		}
		formatted_generic = format_tool_result_for_ai(generic_result)
		test_results.append(
			{"type": "Generic Success Result", "raw": generic_result, "formatted": formatted_generic}
		)

		# Test 2: MCP content result
		mcp_result = {
			"content": [
				{"type": "text", "text": "This is some text content from an MCP tool"},
				{"type": "image", "alt": "A sample image"},
			]
		}
		formatted_mcp = format_tool_result_for_ai(mcp_result)
		test_results.append({"type": "MCP Content Result", "raw": mcp_result, "formatted": formatted_mcp})

		# Test 3: Dictionary result
		dict_result = {
			"name": "John Doe",
			"age": 30,
			"active": True,
			"items": ["a", "b", "c"],
			"metadata": {"key": "value"},
		}
		formatted_dict = format_tool_result_for_ai(dict_result)
		test_results.append({"type": "Dictionary Result", "raw": dict_result, "formatted": formatted_dict})

		# Test 4: String result
		string_result = "This is a simple string result from a tool call"
		formatted_string = format_tool_result_for_ai(string_result)
		test_results.append({"type": "String Result", "raw": string_result, "formatted": formatted_string})

		# Test 5: Error result
		error_result = {"error": "Something went wrong with the tool execution"}
		formatted_error = format_tool_result_for_ai(error_result)
		test_results.append({"type": "Error Result", "raw": error_result, "formatted": formatted_error})

		return {
			"success": True,
			"message": "Comprehensive formatting test completed!",
			"test_results": test_results,
			"total_tests": len(test_results),
		}

	except Exception as e:
		frappe.log_error(f"Comprehensive formatting test failed: {str(e)}", "Juno AI")
		return {"success": False, "error": str(e)}
