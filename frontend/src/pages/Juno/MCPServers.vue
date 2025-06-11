<template>
  <div class="h-screen flex flex-col">
    <PageHeader>
      <Breadcrumbs
        class="h-7"
        :items="[{ label: 'Juno', route: { name: 'JunoHome' } }, { label: 'MCP Servers' }]"
      />
      <div class="flex items-center gap-3">
        <!-- Connection Status -->
        <div v-if="mcpData.data" class="flex items-center gap-2">
          <div
            :class="[
              'h-2 w-2 rounded-full',
              mcpData.data.total_connected > 0 ? 'bg-ink-gray-7' : 'bg-ink-gray-4',
            ]"
          ></div>
          <span class="text-xs text-ink-gray-5">
            {{ mcpData.data.total_connected }}/{{ mcpData.data.total_configured }} connected
          </span>
        </div>
        <!-- Refresh Button -->
        <Button @click="refreshData" appearance="outline" size="sm" :loading="isRefreshing">
          🔄 Refresh
        </Button>
        <!-- Setup Servers Button -->
        <Button @click="setupServers" appearance="primary" size="sm" :loading="isSettingUp">
          ⚙️ Setup Servers
        </Button>
        <!-- Test MCP Client Button -->
        <Button @click="testMcpClient" appearance="success" size="sm" :loading="isTestingMcp">
          🚀 Test MCP Client
        </Button>
      </div>
    </PageHeader>

    <div class="flex-1 overflow-auto">
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <!-- MCP Client Status Section -->
        <div v-if="mcpClientStatus.data" class="space-y-4">
          <h2 class="text-lg font-semibold text-ink-gray-8">MCP Client Status</h2>

          <!-- MCP Client Status -->
          <div class="rounded-lg border border-outline-gray-2 bg-surface-white p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-ink-gray-8">MCP Client</h3>
              <div
                :class="[
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                  mcpClientStatus.data.connected
                    ? 'bg-surface-gray-2 text-ink-gray-7'
                    : 'bg-surface-gray-2 text-ink-gray-6',
                ]"
              >
                <div
                  :class="[
                    'h-2 w-2 rounded-full',
                    mcpClientStatus.data.connected ? 'bg-ink-gray-7' : 'bg-ink-gray-4',
                  ]"
                ></div>
                {{ mcpClientStatus.data.connected ? 'Connected' : 'Disconnected' }}
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div class="text-center">
                <div class="font-semibold text-ink-gray-7">
                  {{ mcpClientStatus.data.servers_configured || 0 }}
                </div>
                <div class="text-ink-gray-6">Configured</div>
              </div>
              <div class="text-center">
                <div class="font-semibold text-ink-gray-7">
                  {{ mcpClientStatus.data.servers_connected || 0 }}
                </div>
                <div class="text-ink-gray-6">Connected</div>
              </div>
              <div class="text-center">
                <div class="font-semibold text-ink-gray-7">
                  {{ mcpClientStatus.data.tools_available || 0 }}
                </div>
                <div class="text-ink-gray-6">Tools</div>
              </div>
              <div class="text-center">
                <div
                  :class="[
                    'font-semibold',
                    mcpClientStatus.data.connected ? 'text-ink-gray-7' : 'text-ink-gray-6',
                  ]"
                >
                  {{ mcpClientStatus.data.client_type || 'Unknown' }}
                </div>
                <div class="text-ink-gray-6">Client Type</div>
              </div>
            </div>

            <div v-if="mcpClientStatus.data.active_servers?.length" class="mt-3">
              <div class="text-xs text-ink-gray-6 mb-1">Active Servers:</div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="server in mcpClientStatus.data.active_servers"
                  :key="server"
                  class="inline-flex items-center px-2 py-1 rounded-full bg-surface-gray-2 text-ink-gray-7 text-xs"
                >
                  {{ server }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Servers Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-ink-gray-8">
              MCP Servers ({{ mcpData.data?.total_configured || 0 }})
            </h2>
            <Select
              v-model="serverFilter"
              :options="filterOptions"
              size="sm"
              variant="outline"
              class="min-w-[120px]"
            />
          </div>

          <div v-if="mcpData.loading" class="text-center py-8">
            <LoadingIndicator class="size-4" />
            <p class="text-sm text-ink-gray-5 mt-2">Loading MCP servers...</p>
          </div>

          <div
            v-else-if="!mcpData.data?.servers || Object.keys(mcpData.data.servers).length === 0"
            class="text-center py-8"
          >
            <div class="text-4xl mb-4">🔧</div>
            <h3 class="text-lg font-medium text-ink-gray-8 mb-2">No MCP Servers Configured</h3>
            <p class="text-sm text-ink-gray-5 mb-4">
              Configure MCP servers in your site_config.json to get started.
            </p>
            <Button @click="showConfigHelp = true" appearance="outline" size="sm">
              📖 View Configuration Help
            </Button>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="[serverName, serverInfo] in filteredServers"
              :key="serverName"
              class="rounded-lg border border-outline-gray-2 bg-surface-white"
            >
              <!-- Server Header -->
              <div class="p-4 border-b border-outline-gray-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <!-- Status & Name -->
                    <div class="flex items-center gap-2">
                      <div
                        :class="[
                          'h-2 w-2 rounded-full',
                          serverInfo.connected ? 'bg-ink-gray-7' : 'bg-ink-gray-4',
                        ]"
                      ></div>
                      <span class="font-semibold text-ink-gray-8">{{ serverName }}</span>
                    </div>

                    <!-- Command -->
                    <span class="text-xs font-mono bg-surface-gray-2 px-2 py-1 rounded">
                      {{ serverInfo.config.command }}
                    </span>
                  </div>

                  <!-- Tools count -->
                  <span class="text-sm text-ink-gray-5">
                    {{ serverInfo.tools_count || 0 }} tools
                  </span>
                </div>

                <!-- Error Message -->
                <div
                  v-if="serverInfo.error"
                  class="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1"
                >
                  Error: {{ serverInfo.error }}
                </div>
              </div>

              <!-- Server Tools -->
              <div v-if="serverInfo.tools && serverInfo.tools.length > 0" class="p-4">
                <div class="space-y-2">
                  <div
                    v-for="tool in serverInfo.tools"
                    :key="tool.name"
                    class="flex items-start gap-3 pl-4 py-2 hover:bg-surface-gray-1 rounded"
                  >
                    <span class="text-ink-gray-4 mt-1">•</span>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-ink-gray-8">{{ tool.name }}</span>
                        <div v-if="tool.input_schema?.properties" class="flex flex-wrap gap-1">
                          <span
                            v-for="param in Object.keys(tool.input_schema.properties).slice(0, 3)"
                            :key="param"
                            class="inline-flex items-center rounded-full bg-surface-gray-2 px-1.5 py-0.5 text-xs text-ink-gray-7"
                          >
                            {{ param }}
                          </span>
                          <span
                            v-if="Object.keys(tool.input_schema.properties).length > 3"
                            class="inline-flex items-center rounded-full bg-surface-gray-2 px-1.5 py-0.5 text-xs text-ink-gray-6"
                          >
                            +{{ Object.keys(tool.input_schema.properties).length - 3 }}
                          </span>
                        </div>
                      </div>
                      <p v-if="tool.description" class="text-xs text-ink-gray-6 mt-1">
                        {{ tool.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Tools Message -->
              <div v-else class="p-4 text-center text-sm text-ink-gray-5">
                No tools available from this server
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Help Modal -->
    <Dialog v-model="showConfigHelp" :options="{ title: 'MCP Server Configuration' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-ink-gray-6">
            Add MCP server configuration to your site's
            <code class="bg-surface-gray-2 px-1 rounded">site_config.json</code>:
          </p>

          <pre class="bg-surface-gray-1 p-4 rounded-lg text-xs overflow-x-auto">{{
            configExample
          }}</pre>

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-ink-gray-8">Available MCP Servers:</h4>
            <ul class="text-xs text-ink-gray-6 space-y-1">
              <li>
                • <code>@modelcontextprotocol/server-filesystem</code> - File system operations
              </li>
              <li>• <code>@modelcontextprotocol/server-git</code> - Git repository operations</li>
              <li>
                • <code>@modelcontextprotocol/server-sqlite</code> - SQLite database operations
              </li>
              <li>• <code>@modelcontextprotocol/server-brave-search</code> - Web search</li>
            </ul>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCall, Breadcrumbs, Select, LoadingIndicator, Button, Dialog } from 'frappe-ui'
import PageHeader from '@/components/PageHeader.vue'

// Reactive data
const showConfigHelp = ref(false)
const serverFilter = ref('all')
const isRefreshing = ref(false)
const isSettingUp = ref(false)
const isTestingMcp = ref(false)

// Unified API call - replaces separate mcpServers and mcpTools calls
const mcpData = useCall({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_servers_and_tools',
  immediate: true,
})

const setupServersCall = useCall({
  url: '/api/v2/method/gameplan.ai.juno.setup_mcp_servers',
})

// MCP client API calls
const mcpClientStatus = useCall({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_status',
  immediate: false,
})

const testMcpClientCall = useCall({
  url: '/api/v2/method/gameplan.ai.juno.test_mcp_setup',
  immediate: false,
})

// Computed properties
const filterOptions = computed(() => [
  { label: 'All Servers', value: 'all' },
  { label: 'Connected', value: 'connected' },
  { label: 'Disconnected', value: 'disconnected' },
])

const filteredServers = computed(() => {
  if (!mcpData.data?.servers) return []

  const servers = Object.entries(mcpData.data.servers)

  if (serverFilter.value === 'all') return servers
  if (serverFilter.value === 'connected') {
    return servers.filter(([_, info]) => info.connected)
  }
  if (serverFilter.value === 'disconnected') {
    return servers.filter(([_, info]) => !info.connected)
  }

  return servers
})

const configExample = computed(() => {
  return `{
  "mcp_servers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "description": "File system operations"
    },
    "git": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-git", "--repository", "/path/to/repo"],
      "description": "Git operations"
    }
  }
}`
})

// Methods
const refreshData = async () => {
  isRefreshing.value = true
  try {
    const refreshPromises = [mcpData.reload()]

    // Also refresh MCP client status if it has been loaded
    if (mcpClientStatus.data || mcpClientStatus.loading) {
      refreshPromises.push(mcpClientStatus.reload())
    }

    await Promise.all(refreshPromises)
  } finally {
    isRefreshing.value = false
  }
}

const setupServers = async () => {
  isSettingUp.value = true
  try {
    await setupServersCall.execute()
    await refreshData()
  } finally {
    isSettingUp.value = false
  }
}

const testMcpClient = async () => {
  isTestingMcp.value = true
  try {
    // Test the MCP client
    await testMcpClientCall.execute()

    // Get the client status after testing
    await mcpClientStatus.reload()

    // Show success notification
    if (testMcpClientCall.data?.success) {
      // Use Frappe's built-in toast notification
      frappe.show_alert({
        message: `MCP client test successful! ${testMcpClientCall.data.tools_count} tools available`,
        indicator: 'green',
      })
    } else {
      frappe.show_alert({
        message: `MCP client test failed: ${testMcpClientCall.data?.error || 'Unknown error'}`,
        indicator: 'red',
      })
    }
  } catch (error) {
    console.error('Error testing MCP client:', error)
    frappe.show_alert({
      message: 'Error testing MCP client',
      indicator: 'red',
    })
  } finally {
    isTestingMcp.value = false
  }
}

// Auto-refresh every 30 seconds and load client status
onMounted(async () => {
  try {
    await mcpClientStatus.execute()
  } catch (error) {
    console.log('MCP client status not available:', error)
  }
})
</script>
