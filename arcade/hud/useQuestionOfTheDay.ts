import { useDoctype } from 'frappe-ui'
import { ref } from 'vue'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

/** The server checks this too (`gp_arcade_answer.py`). */
export const MAX_ANSWER_LENGTH = 140

interface QuestionResponse {
  day: string
  question: string
  answer: string | null
  count: number
  answers: { user: string; full_name: string; appearance: unknown; answer: string }[]
}

export interface QuestionAnswer {
  user: string
  fullName: string
  appearance: AvatarAppearance
  answer: string
}

export interface QuestionOfTheDay {
  question: string
  /** The player's own answer, or null before they answer. */
  answer: string | null
  /** How many people have answered today. */
  count: number
  /** Everyone's answers, oldest first. Empty until the player answers: the server holds them back. */
  answers: QuestionAnswer[]
}

/**
 * The question of the day on the Notice Board, through GP Arcade Answer's `get_question`
 * and `answer_question`, for the player's local date.
 */
export function useQuestionOfTheDay() {
  const answers = useDoctype('GP Arcade Answer')
  const data = ref<QuestionOfTheDay | null>(null)
  const error = ref<string | null>(null)
  const isAnswering = ref(false)
  let loading = false
  /** Someone answered while it was loading: load it once more after. */
  let stale = false

  async function reload() {
    if (loading) {
      stale = true
      return
    }
    loading = true
    try {
      do {
        stale = false
        data.value = parse(
          await answers.runMethod.submit({ method: 'get_question', params: { today: localDate() } }),
        )
        error.value = null
      } while (stale)
    } catch (caught) {
      error.value = errorText(caught, 'Could not load the question')
    } finally {
      loading = false
    }
  }

  /** Answers today's question, or changes today's answer. Throws with a message for the player. */
  async function answer(text: string) {
    isAnswering.value = true
    try {
      data.value = parse(
        await answers.runMethod.submit({
          method: 'answer_question',
          params: { today: localDate(), answer: text },
        }),
      )
    } catch (caught) {
      throw new Error(errorText(caught, 'Could not save your answer'))
    } finally {
      isAnswering.value = false
    }
  }

  void reload()
  return { data, error, isAnswering, reload, answer }
}

function parse(response: QuestionResponse): QuestionOfTheDay {
  return {
    question: response.question,
    answer: response.answer,
    count: response.count,
    answers: response.answers.map((entry) => ({
      user: entry.user,
      fullName: entry.full_name,
      appearance: toAppearance(entry.appearance, defaultAppearance(entry.user)),
      answer: entry.answer,
    })),
  }
}
