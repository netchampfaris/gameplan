# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
New FastMCP Client - Reliable MCP client using FastMCP 2.x library.

This is a completely rewritten implementation that uses modern FastMCP 2.0+ patterns
for improved reliability, performance, and maintainability.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Union

import frappe

# Setup logging
logger = logging.getLogger(__name__)

try:
	from fastmcp import Client as FastMCPClient

	FASTMCP_AVAILABLE = True
	logger.info("FastMCP library is available")
except ImportError as e:
	FASTMCP_AVAILABLE = False
	FastMCPClient = None
	logger.warning(f"FastMCP library not available: {e}")


class ReliableFastMCPClient:
	"""
	Reliable FastMCP client implementation for JunoAI

	This class provides a robust interface to MCP servers using the FastMCP library.
	It handles connection management, tool discovery, and tool execution with proper
	error handling and recovery mechanisms.
	"""

	def __init__(self):
		self._clients: Dict[str, FastMCPClient] = {}
		self._servers_config: Dict[str, Dict[str, Any]] = {}
		self._available_tools: List[Dict[str, Any]] = []
		self._is_initialized = False
		self._connection_lock = asyncio.Lock()

	def _check_availability(self) -> bool:
		"""Check if FastMCP library is available"""
		if not FASTMCP_AVAILABLE:
			error_msg = "FastMCP library not available. Please install with: pip install fastmcp"
			logger.error(error_msg)
			if frappe.conf.get("developer_mode"):
				frappe.log_error(error_msg, "FastMCP Client")
			return False
		return True

	def _get_frappe_mcp_config(self) -> Dict[str, Dict[str, Any]]:
		"""Get MCP servers configuration from Frappe site config"""
		try:
			config = frappe.get_site_config()
			mcp_servers = config.get("mcp_servers", {})
			logger.debug(f"Retrieved MCP servers config: {list(mcp_servers.keys())}")
			return mcp_servers
		except Exception as e:
			logger.error(f"Failed to get MCP config: {e}")
			return {}

	def _create_client_for_server(
		self, server_name: str, server_config: Dict[str, Any]
	) -> Optional[FastMCPClient]:
		"""Create a FastMCP client for a single server"""
		try:
			# In FastMCP 2.0+, we need to use MCPConfig format
			command = server_config.get("command")
			args = server_config.get("args", [])
			env = server_config.get("env", {})

			if not command:
				logger.error(f"No command specified for server {server_name}")
				return None

			# Create MCPConfig format for this server
			mcp_config = {"mcpServers": {server_name: {"command": command, "args": args, "env": env}}}

			# Create client using MCPConfig format
			client = FastMCPClient(mcp_config)
			logger.info(f"Created FastMCP client for server: {server_name}")
			return client

		except Exception as e:
			logger.error(f"Failed to create client for server {server_name}: {e}")
			return None

	async def initialize(self) -> bool:
		"""Initialize the FastMCP clients with current configuration"""
		if not self._check_availability():
			return False

		async with self._connection_lock:
			try:
				# Get fresh configuration
				servers_config = self._get_frappe_mcp_config()
				if not servers_config:
					logger.warning("No MCP servers configured")
					return False

				# Filter enabled servers
				enabled_servers = {
					name: config
					for name, config in servers_config.items()
					if config.get("enabled", True) is not False
				}

				if not enabled_servers:
					logger.warning("No enabled MCP servers found")
					return False

				# Clean up existing clients
				await self._cleanup_clients()

				# Check if we have a single server (optimize for single server case)
				if len(enabled_servers) == 1:
					server_name = list(enabled_servers.keys())[0]
					server_config = enabled_servers[server_name]

					logger.info(f"Single server setup detected: {server_name}")

					# Create single server client
					success = await self._create_single_server_client(server_name, server_config)
					if not success:
						return False

				else:
					# Multi-server setup
					logger.info(f"Multi-server setup: {len(enabled_servers)} servers")

					# Create single multi-server client following FastMCP 2.7.0 documentation
					mcp_config = {"mcpServers": {}}

					# Build the multi-server configuration according to MCPConfig format
					for server_name, server_config in enabled_servers.items():
						command = server_config.get("command")
						args = server_config.get("args", [])
						env = server_config.get("env", {})

						if not command:
							logger.warning(f"No command specified for server {server_name}, skipping")
							continue

						mcp_config["mcpServers"][server_name] = {"command": command, "args": args, "env": env}

					if not mcp_config["mcpServers"]:
						logger.error("No valid server configurations found")
						return False

					# Create single multi-server client using proper FastMCP 2.7.0 pattern
					try:
						multi_client = FastMCPClient(mcp_config)
						self._clients["multi_server"] = multi_client
						logger.info(
							f"Created FastMCP multi-server client with {len(mcp_config['mcpServers'])} servers"
						)
					except Exception as e:
						logger.error(f"Failed to create multi-server client: {e}")
						return False

				# Store the server configuration
				self._servers_config = enabled_servers

				# Discover tools
				await self._discover_tools()

				self._is_initialized = True
				logger.info(
					f"FastMCP client initialization complete. {len(self._servers_config)} servers, {len(self._available_tools)} tools"
				)
				return True

			except Exception as e:
				logger.error(f"Failed to initialize FastMCP client: {e}")
				if frappe.conf.get("developer_mode"):
					import traceback

					frappe.log_error(
						f"FastMCP initialization error: {traceback.format_exc()}", "FastMCP Client"
					)
				return False

	async def _create_single_server_client(self, server_name: str, server_config: Dict[str, Any]) -> bool:
		"""Create a single server client (optimized for single server usage)"""
		try:
			command = server_config.get("command")
			args = server_config.get("args", [])
			env = server_config.get("env", {})

			if not command:
				logger.error(f"No command specified for server {server_name}")
				return False

			# Create single server configuration
			mcp_config = {"mcpServers": {server_name: {"command": command, "args": args, "env": env}}}

			# Create client for single server
			client = FastMCPClient(mcp_config)
			self._clients["single_server"] = client
			self._clients["primary_server"] = server_name  # Store primary server name

			logger.info(f"Created FastMCP single-server client for: {server_name}")
			return True

		except Exception as e:
			logger.error(f"Failed to create single server client for {server_name}: {e}")
			return False

	async def _cleanup_clients(self):
		"""Clean up existing client connections"""
		for server_name, client in self._clients.items():
			try:
				# FastMCP clients are async context managers, proper cleanup handled automatically
				logger.debug(f"Cleaned up client for server: {server_name}")
			except Exception as e:
				logger.warning(f"Error cleaning up client {server_name}: {e}")

		self._clients.clear()

	async def _discover_tools(self):
		"""Discover tools from client using correct FastMCP 2.7.0 patterns"""
		self._available_tools.clear()

		# Determine which client to use
		client = None
		client_type = None

		if "single_server" in self._clients:
			client = self._clients["single_server"]
			client_type = "single_server"
			primary_server = self._clients.get("primary_server", "unknown")
		elif "multi_server" in self._clients:
			client = self._clients["multi_server"]
			client_type = "multi_server"
		else:
			logger.warning("No client available for tool discovery")
			return

		try:
			# Use correct FastMCP 2.7.0 pattern: async with client
			async with client:
				# Get tools from the client
				server_tools = await client.list_tools()

				for tool_info in server_tools:
					# FastMCP returns Tool objects, not dictionaries
					tool_name = getattr(tool_info, "name", "")

					if client_type == "single_server":
						# For single server, tools are not prefixed
						server_name = primary_server
						actual_tool_name = tool_name
						full_name = tool_name
					else:
						# Multi-server setup: tools are prefixed with server name: servername_toolname
						server_name = "unknown"
						actual_tool_name = tool_name

						# Try to match with configured server names first
						for config_server_name in self._servers_config.keys():
							if tool_name.startswith(f"{config_server_name}_"):
								server_name = config_server_name
								actual_tool_name = tool_name[
									len(config_server_name) + 1 :
								]  # +1 for the underscore
								break

						# Fallback: if no configured server matched, try simple split
						if server_name == "unknown" and "_" in tool_name:
							server_name = tool_name.split("_", 1)[0]
							actual_tool_name = tool_name.split("_", 1)[1]

						full_name = tool_name  # Keep the full prefixed name for calling

					# Format tool info for Juno compatibility
					formatted_tool = {
						"server": server_name,
						"name": actual_tool_name,
						"full_name": full_name,
						"description": getattr(tool_info, "description", ""),
						"input_schema": getattr(tool_info, "inputSchema", {}),
					}
					self._available_tools.append(formatted_tool)
					logger.debug(f"Discovered tool: {server_name}.{actual_tool_name}")

		except Exception as e:
			logger.error(f"Failed to discover tools from {client_type} client: {e}")
			return

		logger.info(f"Tool discovery complete: {len(self._available_tools)} tools from {client_type} client")

	# Synchronous interface methods for compatibility with existing Juno code

	def connect(self) -> bool:
		"""Ensure connection is ready (synchronous interface)"""
		try:
			if not self._is_initialized:
				# Check if we're already in an event loop
				try:
					loop = asyncio.get_running_loop()
					# We're in an event loop, create a task
					import concurrent.futures

					with concurrent.futures.ThreadPoolExecutor() as executor:
						future = executor.submit(asyncio.run, self.initialize())
						return future.result()
				except RuntimeError:
					# No event loop running, safe to use asyncio.run
					return asyncio.run(self.initialize())
			return self._is_initialized
		except Exception as e:
			logger.error(f"Connection failed: {e}")
			return False

	def setup_servers(self, servers_config: Dict[str, Dict[str, Any]]) -> bool:
		"""Setup MCP servers from configuration (compatibility method)"""
		try:
			# Store config temporarily, but rely on frappe config for actual setup
			return asyncio.run(self.initialize())
		except Exception as e:
			logger.error(f"Server setup failed: {e}")
			return False

	def list_tools(self) -> List[Dict[str, Any]]:
		"""Get available tools from all MCP servers (synchronous interface)"""
		try:
			if not self._is_initialized:
				if not self.connect():
					return []

			return self._available_tools.copy()
		except Exception as e:
			logger.error(f"List tools failed: {e}")
			return []

	def call_tool(self, server: str, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
		"""Execute tool call (synchronous interface)"""
		# Check if we're already in an event loop
		try:
			loop = asyncio.get_running_loop()
			# We're in an event loop, use ThreadPoolExecutor
			import concurrent.futures

			with concurrent.futures.ThreadPoolExecutor() as executor:
				future = executor.submit(asyncio.run, self._call_tool_async_fresh(server, tool, arguments))
				return future.result()
		except RuntimeError:
			# No event loop running, safe to use asyncio.run
			return asyncio.run(self._call_tool_async_fresh(server, tool, arguments))

	async def _call_tool_async_fresh(
		self, server: str, tool: str, arguments: Dict[str, Any]
	) -> Dict[str, Any]:
		"""Execute tool call with a fresh client instance (avoids state issues)"""
		try:
			# Create a fresh client instance for this call
			fresh_client = ReliableFastMCPClient()

			if not await fresh_client.initialize():
				return {"error": "Failed to initialize fresh MCP client"}

			# Determine which client to use
			client = None
			client_type = None

			if "single_server" in fresh_client._clients:
				client = fresh_client._clients["single_server"]
				client_type = "single_server"
			elif "multi_server" in fresh_client._clients:
				client = fresh_client._clients["multi_server"]
				client_type = "multi_server"
			else:
				return {"error": "No client available"}

			# Determine tool name based on client type first (outside context)
			if client_type == "single_server":
				# For single server, use tool name directly
				tool_name = tool

				# Verify the tool exists
				tool_exists = any(
					available_tool["server"] == server and available_tool["name"] == tool
					for available_tool in fresh_client._available_tools
				)

				if not tool_exists:
					return {"error": f"Tool '{tool}' not found on server '{server}'"}

			else:
				# Multi-server setup: tools are prefixed with server name: servername_toolname
				# Look up the correct prefixed tool name from our discovered tools
				tool_name = None
				for available_tool in fresh_client._available_tools:
					if available_tool["server"] == server and available_tool["name"] == tool:
						tool_name = available_tool["full_name"]
						break

				if not tool_name:
					return {
						"error": f"Tool '{tool}' not found on server '{server}'. Available tools: {[t['name'] for t in fresh_client._available_tools if t['server'] == server]}"
					}

			# Execute the tool call in a clean, single context
			async with client:
				logger.debug(f"Calling FastMCP tool: '{tool_name}' with arguments: {arguments}")
				result = await client.call_tool(tool_name, arguments)
				# Format result for Juno compatibility
				return fresh_client._format_result_for_juno(result)

		except Exception as e:
			import traceback

			error_msg = f"Error executing {server}.{tool}: {str(e)}"
			logger.error(error_msg)
			return {
				"error": error_msg,
				"exception_type": type(e).__name__,
				"exception_message": str(e),
				"traceback": traceback.format_exc(),
			}

	def _format_result_for_juno(self, result: Any) -> Dict[str, Any]:
		"""Format FastMCP result for Juno AI compatibility"""
		try:
			logger.debug(f"Formatting result: type={type(result)}, result={result}")

			# Check if it's a list (direct FastMCP 2.x format)
			if isinstance(result, list):
				content_list = []
				for item in result:
					# Check for TextContent-like objects with attributes
					if hasattr(item, "text") and hasattr(item, "type"):
						content_list.append({"type": item.type, "text": item.text})
					# Check for dict-like format
					elif isinstance(item, dict):
						if item.get("type") == "text" and "text" in item:
							content_list.append({"type": "text", "text": item["text"]})
						else:
							content_list.append(item)
					# Check for nested list format [[["type", "text"], ["text", "..."], ...]]
					elif isinstance(item, list) and len(item) > 0:
						# Handle the nested format returned by some FastMCP implementations
						item_dict = {}
						for pair in item:
							if isinstance(pair, list) and len(pair) == 2:
								key, value = pair
								item_dict[key] = value

						if item_dict.get("type") == "text" and "text" in item_dict:
							content_list.append({"type": "text", "text": item_dict["text"]})
						else:
							content_list.append({"type": "text", "text": str(item)})
					else:
						content_list.append({"type": "text", "text": str(item)})

				return {"content": content_list}

			# Handle result with content attribute (ToolCallResult)
			elif hasattr(result, "content") and hasattr(result, "isError"):
				# FastMCP ToolCallResult object
				if result.isError:
					return {"error": str(result.content)}

				# Format successful result content
				if hasattr(result.content, "__iter__") and not isinstance(result.content, str):
					# List of content items
					content_list = []
					for item in result.content:
						if hasattr(item, "text"):
							content_list.append({"type": "text", "text": item.text})
						elif hasattr(item, "type") and hasattr(item, "text"):
							content_list.append({"type": item.type, "text": item.text})
						else:
							content_list.append({"type": "text", "text": str(item)})
					return {"content": content_list}
				else:
					# Single content item
					return {"content": [{"type": "text", "text": str(result.content)}]}

			elif isinstance(result, dict):
				return result
			elif isinstance(result, str):
				return {"content": [{"type": "text", "text": result}]}
			else:
				return {"content": [{"type": "text", "text": str(result)}]}

		except Exception as e:
			logger.error(f"Failed to format result: {e}")
			logger.error(f"Result type: {type(result)}")
			logger.error(f"Result value: {result}")
			return {"error": f"Failed to format result: {str(e)}"}

	def get_status(self) -> Dict[str, Any]:
		"""Get client status information"""
		return {
			"connected": self._is_initialized,
			"client_type": "ReliableFastMCP",
			"servers_configured": len(self._servers_config),
			"servers_connected": len(self._servers_config) if self._is_initialized else 0,
			"tools_available": len(self._available_tools),
			"active_servers": list(self._servers_config.keys()) if self._is_initialized else [],
			"available_servers": list(self._servers_config.keys()),
		}

	def is_ready(self) -> bool:
		"""Check if client is ready for use"""
		return self._is_initialized and len(self._clients) > 0

	def disconnect(self):
		"""Disconnect from all MCP servers"""
		try:
			asyncio.run(self._disconnect_async())
		except Exception as e:
			logger.error(f"Error during disconnect: {e}")

	async def _disconnect_async(self):
		"""Asynchronous disconnect implementation"""
		async with self._connection_lock:
			await self._cleanup_clients()
			self._available_tools.clear()
			self._servers_config.clear()
			self._is_initialized = False
			logger.info("FastMCP client disconnected")

	def cleanup(self):
		"""Clean up resources"""
		self.disconnect()

	def shutdown(self) -> Dict[str, Any]:
		"""Shutdown client"""
		self.cleanup()
		return {"success": True, "message": "ReliableFastMCP client shutdown complete"}


# Global instance management
_reliable_fastmcp_instance: Optional[ReliableFastMCPClient] = None


def get_mcp_client() -> ReliableFastMCPClient:
	"""Get or create global MCP client instance"""
	global _reliable_fastmcp_instance

	if _reliable_fastmcp_instance is None:
		_reliable_fastmcp_instance = ReliableFastMCPClient()

	return _reliable_fastmcp_instance


def reset_mcp_client():
	"""Reset global MCP client instance (for testing)"""
	global _reliable_fastmcp_instance

	if _reliable_fastmcp_instance:
		_reliable_fastmcp_instance.cleanup()

	_reliable_fastmcp_instance = None


# API endpoints for UI integration


@frappe.whitelist()
def test_mcp_connection():
	"""Test MCP connection (used by UI)"""
	try:
		if not FASTMCP_AVAILABLE:
			return {
				"success": False,
				"error": "FastMCP library not available. Please install with: pip install fastmcp",
			}

		client = get_mcp_client()

		# Test initialization
		success = client.connect()

		if not success:
			return {"success": False, "error": "Failed to initialize MCP client"}

		# Get status and tools
		status = client.get_status()
		tools = client.list_tools()

		return {
			"success": True,
			"status": status,
			"tools_count": len(tools),
			"servers_connected": status.get("servers_connected", 0),
			"ready": client.is_ready(),
		}

	except Exception as e:
		logger.error(f"MCP connection test failed: {e}")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_mcp_tools():
	"""Get available MCP tools (used by UI)"""
	try:
		client = get_mcp_client()
		return client.list_tools()
	except Exception as e:
		logger.error(f"Failed to get MCP tools: {e}")
		return {"error": str(e)}


@frappe.whitelist()
def test_mcp_tool_call(server_name, tool_name, arguments=None):
	"""Test calling a specific MCP tool (used by UI)"""
	try:
		if arguments is None:
			arguments = {}

		client = get_mcp_client()

		if not client.connect():
			return {"success": False, "error": "Failed to connect to MCP client"}

		# Call the tool
		result = client.call_tool(server_name, tool_name, arguments)

		return {
			"success": True,
			"server": server_name,
			"tool": tool_name,
			"arguments": arguments,
			"result": result,
		}

	except Exception as e:
		logger.error(f"MCP tool call test failed: {e}")
		return {"success": False, "error": str(e)}
