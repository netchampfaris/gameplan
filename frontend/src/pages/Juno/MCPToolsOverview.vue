<template>
  <div class="space-y-6">
    <!-- MCP Status Card -->
    <div class="rounded-lg border border-outline-gray-2 bg-surface-white p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-ink-gray-8">MCP Status</h3>
        <Button @click="refreshData" appearance="outline" size="sm" :loading="isRefreshing">
          🔄 Refresh
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Servers Card -->
        <div class="text-center p-4 bg-surface-gray-1 rounded-lg">
          <div class="text-2xl font-bold text-ink-gray-7 mb-1">
            {{ mcpServers.data?.total_configured || 0 }}
          </div>
          <div class="text-sm text-ink-gray-6 mb-1">Configured Servers</div>
          <div class="text-xs text-ink-gray-5">
            {{ mcpServers.data?.total_connected || 0 }} connected
          </div>
        </div>

        <!-- Tools Card -->
        <div class="text-center p-4 bg-surface-gray-1 rounded-lg">
          <div class="text-2xl font-bold text-ink-gray-7 mb-1">
            {{ mcpTools.data?.tools?.length || 0 }}
          </div>
          <div class="text-sm text-ink-gray-6 mb-1">Available Tools</div>
          <div class="text-xs text-ink-gray-5">{{ uniqueServersCount }} servers</div>
        </div>

        <!-- Status Card -->
        <div class="text-center p-4 bg-surface-gray-1 rounded-lg">
          <div
            class="text-2xl mb-1"
            :class="[mcpServers.data?.total_connected > 0 ? 'text-ink-gray-7' : 'text-ink-gray-4']"
          >
            {{ mcpServers.data?.total_connected > 0 ? '✅' : '⚠️' }}
          </div>
          <div class="text-sm text-ink-gray-6 mb-1">
            {{ mcpServers.data?.total_connected > 0 ? 'Active' : 'Inactive' }}
          </div>
          <div class="text-xs text-ink-gray-5">MCP Integration</div>
        </div>
      </div>
    </div>

    <!-- Quick Tools Grid -->
    <div v-if="mcpTools.data?.tools?.length" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-ink-gray-8">Quick Tools</h3>
        <router-link :to="{ name: 'MCPServers' }" class="text-sm text-blue-600 hover:text-blue-700">
          View All →
        </router-link>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="tool in mcpTools.data.tools.slice(0, 6)"
          :key="`${tool.server}.${tool.name}`"
          class="rounded-lg border border-outline-gray-2 bg-surface-white p-3 hover:shadow-sm transition-shadow cursor-pointer"
          @click="suggestToolUse(tool)"
        >
          <div class="flex items-start gap-2">
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-gray-2 text-xs"
            >
              🔧
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1">
                <span class="text-xs font-medium text-ink-gray-6">{{ tool.server }}</span>
                <span class="text-xs text-ink-gray-5">.</span>
                <span class="text-xs font-medium text-ink-gray-8">{{ tool.name }}</span>
              </div>
              <p class="text-xs text-ink-gray-6 mt-1 line-clamp-2">
                {{ tool.description || 'No description available' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Tools State -->
    <div v-else-if="!mcpTools.loading" class="text-center py-8">
      <div class="text-4xl mb-4">🔧</div>
      <h3 class="text-lg font-medium text-ink-gray-8 mb-2">No MCP Tools Available</h3>
      <p class="text-sm text-ink-gray-5 mb-4">
        Configure MCP servers to unlock powerful tool capabilities for Juno.
      </p>
      <router-link :to="{ name: 'MCPServers' }">
        <Button appearance="primary" size="sm"> Configure MCP Servers </Button>
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="mcpTools.loading || mcpServers.loading" class="text-center py-8">
      <LoadingIndicator />
      <p class="text-sm text-ink-gray-5 mt-2">Loading MCP tools...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCall, Button, LoadingIndicator } from 'frappe-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
const isRefreshing = ref(false)

// API calls
const mcpServers = useCall({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_servers',
  immediate: true,
})

const mcpTools = useCall({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_tools',
  immediate: true,
})

// Computed properties
const uniqueServersCount = computed(() => {
  if (!mcpTools.data?.tools) return 0
  const servers = new Set(mcpTools.data.tools.map((tool) => tool.server))
  return servers.size
})

// Methods
const refreshData = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([mcpServers.reload(), mcpTools.reload()])
  } finally {
    isRefreshing.value = false
  }
}

const suggestToolUse = (tool) => {
  // Navigate to chat with a suggested message
  const message = `I'd like to use the ${tool.server}.${tool.name} tool. ${tool.description}`
  router.push({
    name: 'JunoChat',
    query: { message: message },
  })
}
</script>
