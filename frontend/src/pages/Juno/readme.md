# Juno AI Assistant

Juno is an AI-powered assistant for Gameplan that helps users with project management tasks, task creation, team collaboration, and data analysis. It's built using Ollama as the backend AI service and integrates seamlessly with the Gameplan platform.

## Features

- **Real-time AI Chat**: Interactive conversations with intelligent contextual responses
- **Streaming Responses**: Real-time message streaming for immediate feedback
- **Gameplan Context**: Automatically includes relevant user data and project context
- **Model Selection**: Support for multiple AI models (defaults to DeepSeek-R1)
- **Connection Monitoring**: Real-time status of AI service connectivity
- **Responsive Design**: Modern, mobile-friendly interface

## Architecture

### Frontend Structure

```
frontend/src/pages/Juno/
├── JunoHome.vue        # Landing page with greeting and quick actions
├── JunoChat.vue        # Main chat interface
├── JunoResponse.vue    # Response rendering component with markdown support
└── readme.md           # This documentation
```

### Backend Structure

```
gameplan/ai/
└── juno.py             # Main AI service with API endpoints
```

### Route Configuration

Juno uses the following routes in the Gameplan frontend:

```javascript
// Route definitions in frontend/src/router.js
{
  name: 'Juno',
  path: '/juno',
  redirect: { name: 'JunoHome' }
},
{
  name: 'JunoHome',
  path: '/juno/home',
  component: () => import('@/pages/Juno/JunoHome.vue')
},
{
  name: 'JunoChat',
  path: '/juno/chat',
  component: () => import('@/pages/Juno/JunoChat.vue')
}
```

## Components

### JunoHome.vue

The main landing page for Juno AI assistant.

**Features:**

- Personalized greeting based on time of day
- Large search input for starting conversations
- Connection status indicator
- Model selection dropdown
- Quick action suggestions
- Recent conversations (planned feature)

**Key Functionality:**

- Redirects to chat interface when message is sent
- Tests AI service connectivity on mount
- Manages model selection state

### JunoChat.vue

The main chat interface for interactive conversations.

**Features:**

- Real-time chat interface with message history
- Streaming response support with fallback to regular API
- Auto-adjusting textarea for message input
- Message timestamps and loading states
- Connection status monitoring
- Model switching

**Key Functionality:**

- Manages conversation state and message history
- Handles both streaming and non-streaming API calls
- Auto-scrolls to new messages
- Persists selected model in localStorage

### JunoResponse.vue

Component for rendering AI responses with advanced formatting.

**Features:**

- Markdown rendering with prose styling
- Collapsible XML tag blocks for structured content
- Code syntax highlighting
- Responsive typography
- Safe HTML rendering

## API Endpoints

All API endpoints are located in `gameplan/ai/juno.py`:

### Core Endpoints

#### `get_response`

**Purpose:** Get AI response (non-streaming)

```python
@frappe.whitelist()
def get_response(
    message: str,
    conversation_id: str | None = None,
    model: str | None = None
) -> dict[str, Any]
```

**Parameters:**

- `message`: User's input message
- `conversation_id`: Optional conversation ID for context
- `model`: Optional model override

**Response:**

```json
{
  "success": true,
  "response": "AI response text...",
  "model": "deepseek-r1",
  "conversation_id": null,
  "timestamp": "2025-06-09 12:00:00"
}
```

#### `get_streaming_response`

**Purpose:** Get streaming AI response with Server-Sent Events (SSE)

```python
@frappe.whitelist()
def get_streaming_response(
    message: str,
    conversation_id: str | None = None,
    model: str | None = None
)
```

**Returns:** SSE stream with real-time response chunks

**Stream Format:**

```json
// Content chunks
{
    "type": "content",
    "content": "partial response text...",
    "done": false
}

// Completion
{
    "type": "done",
    "success": true,
    "model": "deepseek-r1",
    "timestamp": "2025-06-09 12:00:00"
}

// Error
{
    "type": "error",
    "error": "Error message"
}
```

### Utility Endpoints

#### `test_ollama_connection`

**Purpose:** Test connectivity to Ollama service

```python
@frappe.whitelist()
def test_ollama_connection() -> dict[str, Any]
```

**Response:**

```json
{
  "success": true,
  "connected": true,
  "base_url": "http://localhost:11434",
  "available_models": ["deepseek-r1", "llama2"],
  "configured_model": "deepseek-r1",
  "model_available": true
}
```

#### `get_available_models`

**Purpose:** Get list of available AI models

```python
@frappe.whitelist()
def get_available_models() -> list[str]
```

#### `test_streaming`

**Purpose:** Test streaming functionality (development/debugging)

```python
@frappe.whitelist()
def test_streaming()
```

## Configuration

### Site Configuration

Add to your site's `site_config.json`:

```json
{
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "deepseek-r1",
  "ollama_timeout": 30
}
```

### Environment Setup

1. **Install Ollama**:

   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.ai/
   ```

2. **Pull AI Model**:

   ```bash
   ollama pull deepseek-r1
   ```

3. **Start Ollama Service**:
   ```bash
   ollama serve
   ```

## Context System

Juno automatically includes relevant context from Gameplan:

### Current Context Features

- **User Information**: Current user details and profile
- **Session Data**: Active workspace and permissions

### Planned Context Features

- **Recent Projects**: Last 5 projects user has worked on
- **Pending Tasks**: Up to 10 pending tasks assigned to user
- **Team Memberships**: Teams and roles
- **Dynamic Context**: Keyword-based context inclusion

### Context Building

The `build_gameplan_context()` function in `juno.py` constructs context:

```python
def build_gameplan_context(message: str) -> str:
    """Build context from current user's Gameplan data"""
    context_parts = []

    try:
        # Get current user info
        user = frappe.session.user
        user_doc = frappe.get_doc("User", user)
        context_parts.append(f"Current user: {user_doc.full_name or user}")

        # Additional context features can be added here

    except Exception as e:
        frappe.log_error(f"Error building context: {str(e)}", "Juno Context")
        context_parts.append("Context temporarily unavailable")

    return "\n".join(context_parts) if context_parts else "No specific context available"
```

## Frontend Implementation Details

### State Management

The frontend uses Vue 3 Composition API with:

- **Reactive State**: `ref()` for component state
- **Local Storage**: `useLocalStorage()` for model preferences
- **API Calls**: `useCall()` from frappe-ui for server communication
- **Route Management**: Vue Router for navigation

### Streaming Implementation

```javascript
// Streaming message handling in JunoChat.vue
const sendStreamingMessage = async (message: string) => {
    const eventSource = new EventSource(
        `/api/v2/method/gameplan.ai.juno.get_streaming_response?` +
        `message=${encodeURIComponent(message)}&model=${selectedModel.value}`
    )

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'content') {
            // Append content to current message
            currentMessage.content += data.content
        } else if (data.type === 'done') {
            // Finalize message
            eventSource.close()
        } else if (data.type === 'error') {
            // Handle error and fallback
            eventSource.close()
            sendRegularMessage(message) // Fallback
        }
    }
}
```

### Error Handling

The frontend implements robust error handling:

- **Automatic Fallback**: Streaming failures automatically retry with regular API
- **Connection Monitoring**: Real-time status indicators
- **User Feedback**: Clear error messages and loading states
- **Graceful Degradation**: Features remain functional even with partial failures

## Navigation Integration

Juno is integrated into the main Gameplan sidebar:

```javascript
// In AppSidebar.vue
const navigation = computed(() => {
  return [
    {
      name: 'Juno',
      icon: LucideSparkles,
      route: { name: 'JunoHome' },
      isActive: testRoute(/Juno/g),
    },
    // ... other navigation items
  ]
})
```

## Development

### Running in Development

1. **Start Ollama**: `ollama serve`
2. **Start Frappe**: `bench start`
3. **Start Frontend**: `cd frontend && yarn dev`

### Testing

Use the test endpoints for development:

```javascript
// Test connection
frappe.call({
  method: 'gameplan.ai.juno.test_ollama_connection',
  callback: (r) => console.log(r.message),
})

// Test streaming
fetch('/api/v2/method/gameplan.ai.juno.test_streaming')
```

### Adding Features

1. **Backend**: Add new endpoints in `gameplan/ai/juno.py`
2. **Frontend**: Create new components in `frontend/src/pages/Juno/`
3. **Routes**: Update `frontend/src/router.js` for new pages
4. **Context**: Enhance `build_gameplan_context()` for richer AI context

## Performance Considerations

- **Streaming**: Reduces perceived latency for long responses
- **Connection Pooling**: Reuses Ollama connections efficiently
- **Context Optimization**: Limits context size to prevent token overflow
- **Error Recovery**: Fast fallback mechanisms maintain responsiveness
- **Model Caching**: Selected models persist across sessions

## Security

- **Whitelisted Endpoints**: All API endpoints use `@frappe.whitelist()`
- **User Context**: Only includes data accessible to current user
- **Input Sanitization**: All user inputs are properly escaped
- **Connection Security**: Configurable Ollama endpoint for security
- **Error Masking**: Internal errors are logged but not exposed to users

## Future Enhancements

- **Conversation History**: Persistent chat sessions
- **Rich Context**: Full Gameplan data integration
- **Advanced Actions**: Direct integration with Gameplan features
- **Multi-modal Support**: File uploads and image analysis
- **Team Collaboration**: Shared AI conversations
- **Custom Models**: Support for specialized project management models
