# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

import json
from typing import Any

import frappe
import requests
from werkzeug.wrappers import Response


def get_ollama_config() -> dict[str, str]:
	"""Get Ollama configuration from site config or use defaults"""
	try:
		# Try to get from site config first
		config = frappe.get_site_config()
		return {
			"base_url": config.get("ollama_base_url", "http://localhost:11434"),
			"model": config.get("ollama_model", "deepseek-r1"),
			"timeout": config.get("ollama_timeout", 30),
		}
	except Exception:
		# Fallback to defaults
		return {"base_url": "http://localhost:11434", "model": "deepseek-r1", "timeout": 30}


def get_system_prompt() -> str:
	"""Get the system prompt for Juno AI assistant"""
	return (
		"You are Juno, an AI assistant for Gameplan - a modern project "
		"management and collaboration platform built with Frappe framework.\n\n"
		"Your role is to help users with:\n"
		"- Project management tasks and insights\n"
		"- Task creation, updates, and tracking\n"
		"- Team collaboration and communication\n"
		"- Workflow optimization suggestions\n"
		"- Data analysis and reporting\n"
		"- General productivity assistance\n\n"
		"You have access to the user's Gameplan data and can provide contextual "
		"assistance. Be helpful, concise, and professional. Always consider the "
		"context of their current projects and tasks when responding.\n\n"
		"Guidelines:\n"
		"- Be conversational but professional\n"
		"- Provide actionable suggestions when possible\n"
		"- If you need more information, ask specific questions\n"
		"- Format responses clearly with bullet points or numbered lists when appropriate\n"
		"- Keep responses focused and relevant to project management"
	)


def build_gameplan_context(message: str) -> str:
	"""Build context from current user's Gameplan data"""
	context_parts = []

	try:
		# Get current user info
		user = frappe.session.user
		user_doc = frappe.get_doc("User", user)
		context_parts.append(f"Current user: {user_doc.full_name or user}")

	except Exception as e:
		frappe.log_error(f"Error building context: {str(e)}", "Juno Context")
		context_parts.append("Context temporarily unavailable")

	return "\n".join(context_parts) if context_parts else "No specific context available"


def call_ollama_streaming_api(prompt: str, model: str, base_url: str):
	"""Make streaming API call to Ollama backend"""
	try:
		url = f"{base_url}/api/generate"

		payload = {
			"model": model,
			"prompt": prompt,
			"stream": True,  # Enable streaming
			"options": {"temperature": 0.7, "top_p": 0.9, "max_tokens": 1000},
		}

		headers = {"Content-Type": "application/json"}

		# Get timeout from config
		timeout = get_ollama_config().get("timeout", 30)

		response = requests.post(
			url,
			json=payload,
			headers=headers,
			timeout=timeout,
			stream=True,  # Enable streaming
		)

		response.raise_for_status()

		# Parse streaming response
		for line in response.iter_lines():
			if line:
				try:
					chunk_data = json.loads(line.decode("utf-8"))
					if chunk_data.get("response"):
						yield {
							"type": "content",
							"content": chunk_data.get("response", ""),
							"done": chunk_data.get("done", False),
						}
					elif chunk_data.get("done"):
						yield {"type": "completion"}
						break
				except json.JSONDecodeError:
					continue

	except requests.exceptions.Timeout:
		yield {"type": "error", "error": "AI response timed out. Please try again."}
	except requests.exceptions.ConnectionError:
		yield {"type": "error", "error": "Cannot connect to AI service. Please check if Ollama is running."}
	except requests.exceptions.RequestException as e:
		yield {"type": "error", "error": f"AI service error: {str(e)}"}
	except Exception as e:
		yield {"type": "error", "error": f"Unexpected error: {str(e)}"}


@frappe.whitelist()
def get_streaming_response(message: str, conversation_id: str | None = None, model: str | None = None):
	"""
	Generate streaming AI response using Ollama backend
	Returns Server-Sent Events (SSE) stream
	"""
	try:
		# Get Ollama configuration from site config
		ollama_config = get_ollama_config()

		# Use provided model or fall back to configured model
		selected_model = model or ollama_config.get("model", "deepseek-r1")

		# Build context for the AI model
		context = build_gameplan_context(message)

		# Prepare the prompt with system context and user message
		system_prompt = get_system_prompt()
		full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nUser: {message}\n\nJuno:"

		# Generator function to stream response
		def generate_stream():
			try:
				for chunk in call_ollama_streaming_api(
					prompt=full_prompt,
					model=selected_model,
					base_url=ollama_config.get("base_url", "http://localhost:11434"),
				):
					if chunk.get("type") == "content":
						yield f"data: {json.dumps(chunk)}\n\n"
					elif chunk.get("type") == "error":
						yield f"data: {json.dumps(chunk)}\n\n"
						break

				# Send final completion message
				final_chunk = {
					"type": "completion",
					"success": True,
					"model": ollama_config.get("model", "deepseek-r1"),
					"conversation_id": conversation_id,
					"timestamp": frappe.utils.now(),
				}
				yield f"data: {json.dumps(final_chunk)}\n\n"

			except Exception as e:
				error_chunk = {
					"type": "error",
					"success": False,
					"error": str(e),
					"timestamp": frappe.utils.now(),
				}
				yield f"data: {json.dumps(error_chunk)}\n\n"

		# Create and return Response object directly to bypass Frappe's JSON response handling
		response = Response(
			generate_stream(),
			content_type="text/event-stream",
			headers={
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Cache-Control",
			},
		)
		return response

	except Exception as e:
		frappe.log_error(f"Juno AI Streaming Error: {str(e)}", "Juno AI")
		# Return error as SSE format in Response object
		error_data = f"data: {json.dumps({'type': 'error', 'error': 'Streaming service unavailable'})}\n\n"
		return Response(
			error_data,
			content_type="text/event-stream",
			headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"},
		)


@frappe.whitelist()
def get_available_models() -> list[str]:
	"""Get list of available models from Ollama"""
	try:
		config = get_ollama_config()
		url = f"{config['base_url']}/api/tags"

		response = requests.get(url, timeout=5)
		response.raise_for_status()

		models = response.json().get("models", [])
		model_names = [model.get("name", "") for model in models]

		return model_names

	except Exception as e:
		frappe.log_error(f"Error getting available models: {str(e)}", "Juno AI")
		return []


@frappe.whitelist()
def test_ollama_connection() -> dict[str, Any]:
	"""Test connection to Ollama backend"""
	try:
		config = get_ollama_config()
		url = f"{config['base_url']}/api/tags"

		response = requests.get(url, timeout=5)
		response.raise_for_status()

		models = response.json().get("models", [])
		model_names = [model.get("name", "") for model in models]

		return {
			"success": True,
			"connected": True,
			"base_url": config["base_url"],
			"available_models": model_names,
			"configured_model": config["model"],
			"model_available": config["model"] in model_names,
		}

	except Exception as e:
		return {
			"success": False,
			"connected": False,
			"error": str(e),
			"base_url": get_ollama_config().get("base_url", "unknown"),
		}


@frappe.whitelist()
def test_streaming():
	"""Simple test endpoint for streaming functionality"""

	def generate_test_stream():
		import time

		for i in range(5):
			chunk = {"type": "content", "content": f"This is chunk {i + 1} of 5. ", "done": False}
			yield f"data: {json.dumps(chunk)}\n\n"
			time.sleep(1)  # Simulate processing delay

		final_chunk = {"type": "completion", "success": True, "timestamp": frappe.utils.now()}
		yield f"data: {json.dumps(final_chunk)}\n\n"

	# Return Response object directly to bypass Frappe's JSON response handling
	return Response(
		generate_test_stream(),
		content_type="text/event-stream",
		headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*"},
	)
