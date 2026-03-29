<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Test Page 2</h1>

    <div
      v-for="task in tasks.data"
      :key="task.name"
      class="p-4 mb-4 border border-gray-200 rounded"
    >
      <h2 class="text-xl font-semibold">{{ task.title }}</h2>
      <p>Status: {{ task.status }}</p>
      <p>Priority: {{ task.priority }}</p>
      <p>Due Date: {{ task.due_date }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { GPTask, GPDiscussion } from '@/doctypes'

let tasks = GPTask.getList({
  fields: ['*'],
  limit: 10,
})

// GPTask.permissions.canRead('')

// GPTask.sendMail.submit({
//   email: 'asdf',
// })

// tasks.insert.submit()
</script>
