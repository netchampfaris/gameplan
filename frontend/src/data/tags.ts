import { GPTag } from '@/doctypes'

export const tags = GPTag.getList({
  fields: ['name', 'label'],
  limit: 9999,
})
