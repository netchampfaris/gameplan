<script setup lang="ts">
import { Button, Dialog, ErrorMessage, FormControl, Select, toast, useDoctype } from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import { errorText } from './useHomes'

/**
 * "Your dates": the birthday and work anniversary a player chooses to share, as day and
 * month, never a year of birth. On the day the Common Room throws them a party. Only
 * they can read the dates back (GP Arcade Profile's `get_dates` and `set_dates`).
 *
 * The parent mounts it when it opens, so it loads fresh each time.
 */

const emit = defineEmits<{ close: []; saved: [] }>()

interface DatesResponse {
  birthday: string | null
  work_anniversary: string | null
  work_start_year: number | null
}

/** A day of the year as two pickers; '' is "Not set". */
interface MonthDay {
  month: string
  day: string
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
// February has 29: a leap-day birthday is celebrated on February 28 in other years.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const monthOptions = [
  { label: 'Not set', value: '' },
  ...MONTHS.map((label, index) => ({ label, value: pad(index + 1) })),
]

const open = ref(true)
watch(open, (isOpen) => {
  if (!isOpen) emit('close')
})

const profiles = useDoctype('GP Arcade Profile')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const birthday = reactive<MonthDay>({ month: '', day: '' })
const anniversary = reactive<MonthDay>({ month: '', day: '' })
const startYear = ref<string | number>('')

void load()

async function load() {
  try {
    const dates: DatesResponse = await profiles.runMethod.submit({ method: 'get_dates' })
    Object.assign(birthday, split(dates.birthday))
    Object.assign(anniversary, split(dates.work_anniversary))
    startYear.value = dates.work_start_year ?? ''
  } catch (caught) {
    error.value = errorText(caught, 'Could not load your dates')
  } finally {
    loading.value = false
  }
}

async function save() {
  error.value = ''
  if ((birthday.month && !birthday.day) || (anniversary.month && !anniversary.day)) {
    error.value = 'Pick a day for each date you set.'
    return
  }
  saving.value = true
  try {
    await profiles.runMethod.submit({
      method: 'set_dates',
      params: {
        birthday: join(birthday),
        work_anniversary: join(anniversary),
        work_start_year:
          anniversary.month && startYear.value !== '' ? Number(startYear.value) : null,
      },
    })
  } catch (caught) {
    error.value = errorText(caught, 'Could not save your dates')
    return
  } finally {
    saving.value = false
  }
  toast.success('Dates saved')
  emit('saved')
  open.value = false
}

function dayOptions(date: MonthDay) {
  const days = DAYS_IN_MONTH[Number(date.month) - 1] ?? 31
  return Array.from({ length: days }, (_, index) => ({
    label: String(index + 1),
    value: pad(index + 1),
  }))
}

// A day past the end of the newly picked month (April 31) is no day at all.
for (const date of [birthday, anniversary]) {
  watch(
    () => date.month,
    () => {
      if (!date.month) date.day = ''
      else if (Number(date.day) > (DAYS_IN_MONTH[Number(date.month) - 1] ?? 31)) date.day = ''
    },
  )
}

const hasAnniversary = computed(() => Boolean(anniversary.month))

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** "MM-DD" into pickers. */
function split(value: string | null): MonthDay {
  const [month = '', day = ''] = value?.split('-') ?? []
  return { month, day }
}

/** Pickers into "MM-DD", or null when not set. */
function join(date: MonthDay): string | null {
  return date.month && date.day ? `${date.month}-${date.day}` : null
}
</script>

<template>
  <Dialog v-model:open="open" size="md" title="Your dates">
    <p class="mb-5 text-p-base text-ink-gray-7">
      On your day, the Common Room throws you a party. Only you can see these dates.
    </p>
    <p v-if="loading" class="py-6 text-center text-p-base text-ink-gray-5">Fetching your dates</p>
    <div v-else class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <span class="text-sm text-ink-gray-5">Birthday</span>
        <div class="grid grid-cols-[3fr_2fr] gap-2">
          <Select v-model="birthday.month" :options="monthOptions" placeholder="Month" />
          <Select
            v-model="birthday.day"
            :options="dayOptions(birthday)"
            placeholder="Day"
            :disabled="!birthday.month"
          />
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-ink-gray-5">Work anniversary</span>
        <div class="grid grid-cols-[3fr_2fr] gap-2">
          <Select v-model="anniversary.month" :options="monthOptions" placeholder="Month" />
          <Select
            v-model="anniversary.day"
            :options="dayOptions(anniversary)"
            placeholder="Day"
            :disabled="!anniversary.month"
          />
        </div>
        <FormControl
          v-if="hasAnniversary"
          v-model="startYear"
          type="number"
          label="Year you joined (optional)"
          description="Used to count your years on the team."
          placeholder="2021"
        />
      </div>
      <ErrorMessage v-if="error" :message="error" />
    </div>

    <template #actions>
      <div class="flex justify-end">
        <Button variant="solid" label="Save" :loading="saving" :disabled="loading" @click="save" />
      </div>
    </template>
  </Dialog>
</template>
