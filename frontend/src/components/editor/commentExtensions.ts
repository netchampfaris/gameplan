import { CommentKit, SlashCommands } from 'frappe-ui/editor'
import { gameplanHeadingLevels, suggestionConfig, richQuoteExtensions } from './config'
import type { RichQuoteController } from '@/components/RichQuoteExtension/useRichQuotes'

/**
 * The lighter comment stack: CommentKit (no toc / iframe) + tables +
 * @-mentions + #-tags + RichQuote + slash commands. Used by CommentEditor —
 * which also renders the discussion post body — so tables created in a
 * discussion render and edit here too.
 *
 * SlashCommands is layered on top of CommentKit (which omits it by default).
 * Its command registry self-prunes via each command's `isAvailable` predicate,
 * so the "/" menu only offers what the comment schema actually supports
 * (headings, lists, blockquote, code block, image/video, link, table, rule) —
 * toc / embed / task-list entries drop out because those nodes aren't loaded.
 *
 * Kept in its own module (not config.ts) so CommentKit only loads in the comment
 * box chunk, never in the rich-editor or shared GPEditor chunks.
 */
export function commentExtensions(
  opts: { controller?: RichQuoteController | null; sourceId?: string } = {},
) {
  return [
    CommentKit.configure({
      heading: { levels: [...gameplanHeadingLevels] },
      table: {},
      ...suggestionConfig(true),
    }),
    SlashCommands.configure({}),
    ...richQuoteExtensions(opts.controller, opts.sourceId),
  ]
}
