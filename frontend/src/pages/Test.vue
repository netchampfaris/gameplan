<template>
  <div class="p-5">
    <div class="mb-5 flex">
      {{ filters }}
      <FormControl
        type="select"
        v-model="filters.project"
        :options="['1', '2', '2', '3']"
      />
    </div>
    <ListView
      :columns="columns"
      :options="{ showTooltip: false }"
      :rows="rows"
      row-key="name"
    />
    <!-- <div class="w-1/2 border p-6">
      <Progress :value="50" label="Your total contribution">
        <template #hint>
          <span class="text-base font-medium text-gray-500">$25k / $50k</span>
        </template>
      </Progress>
    </div> -->
  </div>
</template>
<script>
import { FormControl, ListView, Progress } from 'frappe-ui'

export default {
  name: 'Test',
  data() {
    return {
      filters: {
        project: null,
      },
    }
  },
  resources: {
    ping() {
      return {
        url: 'ping',
        auto: true,
        onError(err) {
          console.log('handling error')
        },
      }
    },
    discussions() {
      console.log(this.filters)
      return {
        type: 'list',
        doctype: 'GP Discussion',
        filters: this.filters,
        fields: ['name', 'title'],
        auto: true,
        pageLength: 20,
      }
    },
  },
  computed: {
    columns() {
      return [
        { label: 'Name', key: 'name' },
        { label: 'Title', key: 'title' },
      ]
    },
    rows() {
      return this.$resources.discussions.data || []
    },
  },
  components: { ListView, Progress, FormControl },
}
</script>
