import { useList } from 'frappe-ui'
import { computed } from 'vue'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog'
import type { NoteBoard } from '../bridge'

/** The server checks this too (`gp_arcade_note.py`). */
export const MAX_NOTE_LENGTH = 280
/** How many notes a board shows: the newest ones. */
const NOTE_LIMIT = 30

interface NoteRow {
  name: string
  /** The author. */
  owner: string
  creation: string
  board: NoteBoard['board']
  /** The Home whose Guestbook holds the note; null on the Notice Board. */
  home: string | null
  message: string
}

interface ProfileRow {
  name: string
  user: string
  full_name: string | null
}

interface ArcadeProfileRow {
  name: string
  user: string
  /** A JSON field: the v2 list API sends it as a string. */
  appearance: string | AvatarAppearance | null
}

export interface ArcadeNote extends NoteRow {
  author: { name: string; appearance: AvatarAppearance }
}

/**
 * The newest notes on one board, with who wrote each: their name and their Arcade look.
 */
export function useArcadeNotes(board: NoteBoard) {
  const notes = useList<NoteRow>({
    doctype: 'GP Arcade Note',
    filters:
      board.board === 'Guestbook'
        ? { board: 'Guestbook', home: board.home }
        : { board: 'Notice Board' },
    fields: ['name', 'owner', 'creation', 'board', 'home', 'message'],
    orderBy: 'creation desc',
    limit: NOTE_LIMIT,
  })

  const authors = computed(() => [...new Set((notes.data ?? []).map((note) => note.owner))].sort())
  const profiles = useList<ProfileRow>({
    doctype: 'GP User Profile',
    filters: () => ({ user: ['in', authors.value] }),
    fields: ['name', 'user', 'full_name'],
    limit: NOTE_LIMIT,
  })
  const looks = useList<ArcadeProfileRow>({
    doctype: 'GP Arcade Profile',
    filters: () => ({ user: ['in', authors.value] }),
    fields: ['name', 'user', 'appearance'],
    limit: NOTE_LIMIT,
  })

  const data = computed<ArcadeNote[]>(() => {
    const names = new Map((profiles.data ?? []).map((row) => [row.user, row.full_name]))
    const appearances = new Map((looks.data ?? []).map((row) => [row.user, row.appearance]))
    return (notes.data ?? []).map((note) => {
      const saved = appearances.get(note.owner)
      return {
        ...note,
        author: {
          name: names.get(note.owner) || note.owner,
          appearance: toAppearance(
            typeof saved === 'string' ? parseJson(saved) : saved,
            defaultAppearance(note.owner),
          ),
        },
      }
    })
  })

  async function post(message: string) {
    const home = board.board === 'Guestbook' ? board.home : null
    await notes.insert.submit({ board: board.board, home, message })
  }

  async function remove(name: string) {
    await notes.delete.submit({ name })
  }

  return {
    data,
    isLoading: computed(() => notes.data === null && !notes.error),
    error: computed(() => notes.error),
    isPosting: computed(() => notes.insert.loading),
    isRemoving: (name: string) => notes.delete.isLoading(name),
    post,
    remove,
    reload: () => notes.reload(),
  }
}

/**
 * How many notes in the user's own Guestbook arrived since they last read it. Reading
 * the Guestbook moves `guestbook_read_at` on their GP Arcade Profile up to the newest
 * note (`markRead`); using a note's own time keeps client clocks out of it.
 */
export function useGuestbookUnread(user: string) {
  const notes = useList<{ name: string; creation: string }>({
    doctype: 'GP Arcade Note',
    filters: { board: 'Guestbook', home: user, owner: ['!=', user] },
    fields: ['name', 'creation'],
    orderBy: 'creation desc',
    limit: NOTE_LIMIT,
  })
  const profile = useList<{ name: string; user: string; guestbook_read_at: string | null }>({
    doctype: 'GP Arcade Profile',
    filters: { user },
    fields: ['name', 'user', 'guestbook_read_at'],
    limit: 1,
  })

  const readAt = computed(() => profile.data?.[0]?.guestbook_read_at ?? null)
  // Both are "YYYY-MM-DD HH:mm:ss.ffffff" in server time, so they compare as strings.
  const count = computed(
    () => (notes.data ?? []).filter((note) => !readAt.value || note.creation > readAt.value).length,
  )

  async function markRead() {
    await notes.reload()
    const newest = notes.data?.[0]?.creation
    if (!newest || (readAt.value && newest <= readAt.value)) return
    const row = profile.data?.[0]
    if (row) await profile.setValue.submit({ name: row.name, guestbook_read_at: newest })
    else await profile.insert.submit({ user, guestbook_read_at: newest })
    await profile.reload()
  }

  return { count, reload: () => notes.reload(), markRead }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
