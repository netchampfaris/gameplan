# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors

"""
Unit tests for FastMCP client implementation
"""

import unittest
from unittest.mock import MagicMock, patch

import frappe

from gameplan.gameplan.ai.mcp_fastclient import FastMCPProxy, get_fastmcp_proxy, reset_fastmcp_proxy


class TestFastMCPClient(unittest.TestCase):
	"""Test cases for FastMCP client"""

	def setUp(self):
		"""Set up test environment"""
		# Reset global instance for clean tests
		reset_fastmcp_proxy()

	def tearDown(self):
		"""Clean up after tests"""
		reset_fastmcp_proxy()

	def test_proxy_instantiation(self):
		"""Test basic proxy instantiation"""
		proxy = FastMCPProxy()
		self.assertIsNotNone(proxy)
		self.assertFalse(proxy.is_ready())
		self.assertEqual(len(proxy._servers_config), 0)

	def test_global_instance(self):
		"""Test global proxy instance management"""
		proxy1 = get_fastmcp_proxy()
		proxy2 = get_fastmcp_proxy()
		self.assertIs(proxy1, proxy2)  # Should be same instance

	@patch("frappe.get_site_config")
	def test_configuration_conversion(self, mock_config):
		"""Test configuration conversion from Frappe to FastMCP format"""
		# Mock Frappe configuration
		mock_config.return_value = {
			"mcp_servers": {
				"filesystem": {
					"command": "npx",
					"args": ["@modelcontextprotocol/server-filesystem", "/tmp"],
					"env": {"TEST": "value"},
				}
			}
		}

		proxy = FastMCPProxy()
		frappe_config = proxy._get_frappe_mcp_config()

		self.assertEqual(len(frappe_config), 1)
		self.assertIn("filesystem", frappe_config)

		# Test conversion
		mcp_config = proxy._convert_frappe_config_to_fastmcp(frappe_config)
		self.assertIn("mcpServers", mcp_config)
		self.assertIn("filesystem", mcp_config["mcpServers"])
		self.assertEqual(mcp_config["mcpServers"]["filesystem"]["command"], "npx")

	def test_status_reporting(self):
		"""Test status reporting functionality"""
		proxy = FastMCPProxy()
		status = proxy.get_status()

		self.assertIn("connected", status)
		self.assertIn("client_type", status)
		self.assertEqual(status["client_type"], "FastMCP")
		self.assertFalse(status["connected"])

	@patch("gameplan.gameplan.ai.mcp_fastclient.FASTMCP_AVAILABLE", False)
	def test_unavailable_library_handling(self):
		"""Test handling when FastMCP library is not available"""
		proxy = FastMCPProxy()
		result = proxy._check_availability()
		self.assertFalse(result)

	def test_error_handling(self):
		"""Test error handling in various scenarios"""
		proxy = FastMCPProxy()

		# Test tool call without connection
		result = proxy.call_tool("test_server", "test_tool", {})
		self.assertIn("error", result)

		# Test list tools without connection
		tools = proxy.list_tools()
		self.assertEqual(len(tools), 0)

	def test_cleanup(self):
		"""Test cleanup functionality"""
		proxy = FastMCPProxy()
		proxy._config_loaded = True
		proxy._available_tools = [{"server": "test", "name": "tool"}]

		proxy.cleanup()

		self.assertFalse(proxy._config_loaded)
		self.assertEqual(len(proxy._available_tools), 0)

	@patch("frappe.get_site_config")
	@patch("gameplan.gameplan.ai.mcp_fastclient.FASTMCP_AVAILABLE", True)
	def test_setup_failure_handling(self, mock_config):
		"""Test handling of setup failures"""
		# Mock configuration that causes setup failure
		mock_config.return_value = {"mcp_servers": {}}

		proxy = FastMCPProxy()
		result = proxy.setup_from_frappe_config()

		# Should fail due to no servers configured
		self.assertFalse(result)

	def test_tool_result_formatting(self):
		"""Test tool result formatting for Juno compatibility"""
		proxy = FastMCPProxy()

		# Test dict result
		dict_result = {"key": "value"}
		formatted = proxy._format_for_juno(dict_result)
		self.assertEqual(formatted, dict_result)

		# Test string result
		string_result = "test result"
		formatted = proxy._format_for_juno(string_result)
		self.assertIn("content", formatted)
		self.assertEqual(formatted["content"][0]["type"], "text")
		self.assertEqual(formatted["content"][0]["text"], string_result)

		# Test list result
		list_result = ["item1", "item2"]
		formatted = proxy._format_for_juno(list_result)
		self.assertIn("content", formatted)
		self.assertEqual(formatted["content"], list_result)


if __name__ == "__main__":
	unittest.main()
