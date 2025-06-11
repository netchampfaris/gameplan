# MCP Integration for Gameplan/JunoAI

This document explains the Model Context Protocol (MCP) integration in the Gameplan project for the JunoAI assistant.

## Overview

Gameplan includes a powerful MCP client implementation that enables JunoAI to interact with external tools and services. The MCP client uses the FastMCP library for high-performance, reliable connections to MCP servers.

## Architecture

### Single Implementation
- **MCP Client** (`gameplan/ai/mcp_client.py`) - High-performance client using FastMCP 2.x library
- **Client Type**: ReliableFastMCP - Individual client management for each server
- **Features**: Async/await patterns, connection pooling, comprehensive error handling

## Configuration

Add MCP servers to your site's `site_config.json`:

```json
{
  "mcp_servers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/yourusername/Projects"],
      "description": "File system operations"
    },
    "google_calendar": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-google-calendar"],
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_KEY": "/path/to/service-account-key.json"
      },
      "description": "Google Calendar integration"
    }
  }
}
```

## Available API Endpoints

### Setup and Testing
- `gameplan.ai.juno.test_mcp_setup` - Test MCP client setup and functionality
- `gameplan.ai.juno.setup_mcp_servers` - Initialize configured MCP servers

### Status and Information
- `gameplan.ai.juno.get_mcp_status` - Get current MCP client status
- `gameplan.ai.juno.get_mcp_servers` - Get server configuration and status
- `gameplan.ai.juno.get_mcp_tools` - Get available tools from all servers

### Management
- `gameplan.ai.juno.reset_mcp` - Reset MCP client (useful for testing)

## Frontend Integration

The MCP integration includes a comprehensive frontend interface:

### MCP Servers Page (`frontend/src/pages/Juno/MCPServers.vue`)
- **Client Status Panel**: Real-time status of the MCP client
- **Server Overview**: Configuration and connection status for each server
- **Tools Display**: Available tools from each server with descriptions
- **Testing Interface**: Test client functionality and view results

### Key Features
- ✅ **Real-time Status**: Live connection and tool availability monitoring
- 🔄 **Auto-refresh**: Automatic updates every 30 seconds
- 📊 **Metrics Display**: Servers configured/connected, tools available
- 🎨 **Status Indicators**: Color-coded connection status
- 📱 **Responsive Design**: Works on desktop and mobile

## Tool Usage in JunoAI

JunoAI can automatically use available MCP tools when:
1. **Tools are configured** in site_config.json
2. **Servers are connected** and responding
3. **User requests** match tool capabilities

### Example Tool Usage
```
User: "List files in my projects directory"
JunoAI: Uses filesystem.list_directory tool automatically

User: "What's on my calendar today?"
JunoAI: Uses google_calendar.list_events tool automatically
```

## Popular MCP Servers

### File System Operations
```bash
npm install @modelcontextprotocol/server-filesystem
```

### Git Operations
```bash
npm install @modelcontextprotocol/server-git
```

### SQLite Database
```bash
npm install @modelcontextprotocol/server-sqlite
```

### Web Search (Brave)
```bash
npm install @modelcontextprotocol/server-brave-search
```

## Troubleshooting

### Common Issues

1. **Servers not connecting**
   - Check that MCP server packages are installed
   - Verify paths and environment variables in configuration
   - Use the test button in the MCP Servers page

2. **Tools not available**
   - Ensure servers are connected (green status indicators)
   - Check server logs for errors
   - Verify tool permissions and requirements

3. **Performance issues**
   - Monitor connection status in the frontend
   - Use the reset button to reinitialize connections
   - Check server resource usage

### Debug Information

Enable debug logging by setting `developer_mode: true` in site_config.json. This will show detailed MCP operations in the console.

## Best Practices

1. **Server Configuration**
   - Use absolute paths for file system operations
   - Set appropriate environment variables for authenticated services
   - Test server connections before deploying

2. **Performance**
   - Limit file system access to necessary directories
   - Monitor tool usage and server response times
   - Use appropriate timeouts for network operations

3. **Security**
   - Restrict file system access to safe directories
   - Use service accounts for external API access
   - Regularly update MCP server packages

## Development

For development and testing:

```python
# Test the MCP client programmatically
from gameplan.ai.mcp_client import get_mcp_client

client = get_mcp_client()
if client.connect():
    tools = client.list_tools()
    print(f"Available tools: {len(tools)}")
```

The MCP integration provides a powerful foundation for extending JunoAI's capabilities with external tools and services.