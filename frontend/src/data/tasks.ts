import { MaybeRefOrGetter } from 'vue'
import { GPTask } from '@/doctypes'

export function useTask(taskId: MaybeRefOrGetter<string>) {
  return GPTask.getDoc(taskId)
}
