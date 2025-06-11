# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import json
import re
from typing import Any

import frappe
import frappe.utils
import requests
from werkzeug.wrappers import Response


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
		"You are Juno, an AI assistant that helps users with various tasks. "
		"You have access to tools that allow you to interact with the filesystem, "
		"manage files, and perform other operations.\n\n"
		"When users ask about files, directories, or data - use the available tools "
		"to provide direct results. Don't ask for permission - use tools to accomplish "
		"the user's request whenever possible.\n\n"
		"Be helpful, concise, and always prioritize using tools when they can "
		"accomplish the user's request.\n\n"
		"Don't overthink or spend too much time reasoning internally. If you need "
		"clarification about what the user wants, ask direct questions rather than "
		"making assumptions. Keep your responses clear and actionable."
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
		return client.list_tools()
	except Exception as e:
		frappe.log_error(f"Failed to get MCP tools: {str(e)}", "Juno AI")
		return []


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
			"For example: filesystem.read_file or google_calendar.list_calendars\n\n"
			"Always use tools when they can help accomplish the user's request. "
			"Don't ask for permission - use the appropriate tools directly.\n"
		)

		return enhanced_prompt

	except Exception as e:
		frappe.log_error(f"Failed to enhance prompt with MCP tools: {str(e)}", "Juno AI")
		return base_prompt


def execute_mcp_tool_call(tool_call: dict[str, Any]) -> dict[str, Any]:
	"""Execute an MCP tool call"""
	try:
		function_name = tool_call.get("name", "")
		arguments = tool_call.get("arguments", {})

		if "." not in function_name:
			return {"error": "Invalid tool name format. Expected format: server.tool"}

		server, tool = function_name.split(".", 1)

		client = get_mcp_client()
		result = client.call_tool(server, tool, arguments)
		return result

	except Exception as e:
		frappe.log_error(f"MCP tool call failed: {str(e)}", "Juno AI")
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
		return f"Error: {tool_result['error']}"

	content = tool_result.get("content", [])
	if isinstance(content, list) and content:
		text_parts = []
		for item in content:
			if isinstance(item, dict) and item.get("type") == "text":
				text_parts.append(item.get("text", ""))
		return "\n".join(text_parts) if text_parts else str(content)

	return str(tool_result)


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
