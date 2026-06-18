import {
  computed,
  inject,
  nextTick,
  provide,
  shallowReactive,
  shallowRef,
  watch,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import type { Editor } from '@tiptap/core'
import type { GPComment } from '@/types/doctypes'
import { extractQuotedText, findDomRange, htmlToQuotedText } from './quoteTextSearch'
import { quoteBacklinksPluginKey } from './quote-backlink-decoration'

/**
 * The single coordinator for the rich-quote feature within a discussion.
 *
 * One controller (provide/inject) replaces the former split between a backlinks
 * store and an imperative, event-bubbling handler:
 *   - quote *producers* (QuoteReplyButton, the inserted quote's node view) call
 *     `requestQuote` / `navigateToQuote` directly instead of emitting events that
 *     bubble up four components to DiscussionView;
 *   - quote *targets* (the new-comment editor) and *sources* (the post body, each
 *     comment) register themselves so the controller never reaches into another
 *     component's exposed internals.
 *
 * Provided by DiscussionView, fed the comment list by CommentsArea, consumed by
 * each editor surface.
 */

export interface QuoteBacklink {
  quotingCommentId: string
  quotedText: string
  occurrence: number
  author: string
  creation: string
}

interface ParsedQuote {
  sourceId: string
  quotedText: string
  occurrence: number
}

/** The reply editor a quote gets inserted into (the discussion's new-comment box). */
interface ReplyTarget {
  open: () => void
  getEditor: () => Editor | null
}

/** How to reach a quoted comment's rendered content for scroll-back. */
interface CommentNavigator {
  getCommentEl: (id: string) => HTMLElement | null | undefined
  scrollToComment: (id: string) => void
  highlightComment: (id: string) => void
}

export interface RichQuoteController {
  commentsData: ShallowRef<GPComment[] | null>
  getFor: (sourceId: string) => QuoteBacklink[]
  popover: { open: boolean; anchorEl: HTMLElement | null; items: QuoteBacklink[] }
  openPopover: (anchorEl: HTMLElement, items: QuoteBacklink[]) => void
  closePopover: () => void
  // surfaces announce themselves rather than being reached into
  setReplyTarget: (target: ReplyTarget | null) => void
  setCommentNavigator: (navigator: CommentNavigator | null) => void
  setPostContentEl: (get: () => HTMLElement | null) => void
  // actions called directly by quote producers
  requestQuote: (payload: {
    sourceId: string
    author: string
    html: string
    occurrence: number
  }) => Promise<void>
  navigateToQuote: (payload: {
    quoteId: string
    content: string
    author?: string
    occurrence?: number
  }) => void
}

const controllerKey: InjectionKey<RichQuoteController> = Symbol('rich-quotes')
const EMPTY: QuoteBacklink[] = []
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th'

export function provideRichQuotes(): RichQuoteController {
  const commentsData = shallowRef<GPComment[] | null>(null)

  const parseCache = new Map<string, { stamp: string; quotes: ParsedQuote[] }>()

  const registry = computed(() => {
    const map = new Map<string, QuoteBacklink[]>()
    for (const comment of commentsData.value ?? []) {
      if (comment.deleted_at || !comment.content) continue

      const stamp = String(comment.modified)
      let cached = parseCache.get(comment.name)
      if (!cached || cached.stamp !== stamp) {
        cached = { stamp, quotes: parseRichQuotes(comment.content) }
        parseCache.set(comment.name, cached)
      }

      for (const quote of cached.quotes) {
        const list = map.get(quote.sourceId) ?? []
        list.push({
          quotingCommentId: comment.name,
          quotedText: quote.quotedText,
          occurrence: quote.occurrence,
          author: comment.owner,
          creation: comment.creation,
        })
        map.set(quote.sourceId, list)
      }
    }
    return map
  })

  const popover = shallowReactive({
    open: false,
    anchorEl: null as HTMLElement | null,
    items: [] as QuoteBacklink[],
  })

  let replyTarget: ReplyTarget | null = null
  let commentNavigator: CommentNavigator | null = null
  let getPostContentEl: () => HTMLElement | null = () => null

  async function requestQuote({
    sourceId,
    author,
    html,
    occurrence,
  }: {
    sourceId: string
    author: string
    html: string
    occurrence: number
  }) {
    if (!html || html.trim() === '') return

    replyTarget?.open()
    await nextTick()

    const editor = replyTarget?.getEditor()
    if (!editor) return

    const occurrenceAttr = occurrence ? ` data-rich-quote-occurrence="${occurrence}"` : ''
    const content = `<blockquote data-rich-quote-id="${sourceId}" data-author="${author}"${occurrenceAttr}>${html}</blockquote><p></p>`
    editor.chain().focus().insertContent(content).run()
  }

  function navigateToQuote({
    quoteId,
    content,
    occurrence = 0,
  }: {
    quoteId: string
    content: string
    occurrence?: number
  }) {
    if (!quoteId || !content) return

    const [type, idValue] = quoteId.split(':')
    if (type !== 'comment' && type !== 'discussion') return

    // Anchor by normalized plain text, not HTML — server-side sanitization and
    // mark re-serialization change the markup between insertion and render.
    const quotedText = htmlToQuotedText(content)

    const container =
      type === 'comment'
        ? (commentNavigator?.getCommentEl(idValue) ?? null)
        : getPostContentEl()

    if (!container) {
      if (type === 'comment') commentNavigator?.scrollToComment(idValue)
      return
    }

    const searchRoot = container.querySelector<HTMLElement>('.ProseMirror') ?? container
    const range = quotedText ? findDomRange(searchRoot, quotedText, occurrence) : null

    if (range) {
      scrollAndHighlight(nearestBlockElement(range) ?? searchRoot)
    } else if (type === 'comment') {
      // quoted passage no longer exists (source edited) — highlight the whole comment
      commentNavigator?.scrollToComment(idValue)
      commentNavigator?.highlightComment(idValue)
    } else {
      scrollAndHighlight(container)
    }
  }

  const controller: RichQuoteController = {
    commentsData,
    getFor: (sourceId) => registry.value.get(sourceId) ?? EMPTY,
    popover,
    openPopover(anchorEl, items) {
      popover.anchorEl = anchorEl
      popover.items = items
      popover.open = true
    },
    closePopover() {
      popover.open = false
    },
    setReplyTarget: (target) => {
      replyTarget = target
    },
    setCommentNavigator: (navigator) => {
      commentNavigator = navigator
    },
    setPostContentEl: (get) => {
      getPostContentEl = get
    },
    requestQuote,
    navigateToQuote,
  }

  provide(controllerKey, controller)
  return controller
}

export function useRichQuotes(): RichQuoteController | null {
  return inject(controllerKey, null)
}

/**
 * Keep a source surface's "quoted by" badges in sync. Decoration options aren't
 * reactive, so the plugin is nudged whenever the backlink list or editable state
 * changes. Centralized here so every editor surface gets it the same way (rather
 * than each re-implementing the watch).
 */
export function useBacklinkRefresh(
  editor: Ref<Editor | null>,
  sourceId: string | undefined,
  isEditable: () => boolean,
) {
  const controller = useRichQuotes()
  if (!controller || !sourceId) return

  watch(
    [() => controller.getFor(sourceId), isEditable, editor],
    () => {
      const e = editor.value
      if (!e) return
      e.view.dispatch(e.state.tr.setMeta(quoteBacklinksPluginKey, 'refresh'))
    },
    { flush: 'post' },
  )
}

function parseRichQuotes(html: string): ParsedQuote[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const quotes: ParsedQuote[] = []
  for (const el of doc.querySelectorAll<HTMLElement>('blockquote[data-rich-quote-id]')) {
    // a quote-of-a-quote shouldn't count as quoting the inner quote's source
    if (el.parentElement?.closest('blockquote[data-rich-quote-id]')) continue

    const sourceId = el.getAttribute('data-rich-quote-id')
    const quotedText = extractQuotedText(el)
    if (!sourceId || !quotedText) continue

    const occurrence = Number(el.getAttribute('data-rich-quote-occurrence')) || 0
    quotes.push({ sourceId, quotedText, occurrence })
  }
  return quotes
}

function nearestBlockElement(range: Range): HTMLElement | null {
  const node = range.commonAncestorContainer
  const el = node instanceof HTMLElement ? node : node.parentElement
  return el?.closest<HTMLElement>(BLOCK_SELECTOR) ?? el
}

function scrollAndHighlight(element: HTMLElement) {
  element.scrollIntoView({ block: 'center' })
  element.classList.add('highlighted-quote-target')
  setTimeout(() => {
    element.classList.remove('highlighted-quote-target')
  }, 2500)
}
