# Gameplan #gameplan — Unresolved Bugs

Bugs reported in the internal Raven **#gameplan** channel (window 2026-04-14 → 2026-06-14)
that are **not yet fixed**. Resolved & committed already: E1, E2, E4, E6, E9, D3.

`fui` = fix lives in vendored `frappe-ui/` · `gp` = gameplan-local.
Confidence: **VERIFIED** = mechanism located · **LIKELY** = strong hypothesis, no live repro · **UNCONFIRMED** = doesn't reproduce on current branch.

> Note: line numbers are from the original triage and may have drifted — re-grep before relying on them.

---

## Editor — frappe-ui

### E3 — Image resizer hidden behind scrollbar (PARTIAL) · `fui`+`gp` · VERIFIED
Right resize handle sits at the same edge as the editor's vertical scrollbar, with no gutter reserved.
- Done: handle hit-area widened (`MediaResizeHandles.vue`, committed).
- Still open: the `scrollbar-gutter: stable` approach on the scroll container **did not work** — handle still ends up under/behind the scrollbar. Needs a different fix.
- Location: `MediaNodeView.vue:219-223`, `frontend/src/components/editor/GPEditor.vue` (scrollStyle).

### E5 — Empty paragraph collapses in read-only view · `fui` · VERIFIED
prose-v3 has zero paragraph margins; spacing relies on empty `<p>` line-boxes. Read-only render omits the trailing `<br>`, so empty `<p>` collapses to 0px and paragraphs touch.
- Location: `frappe-ui/tailwind/plugin.js:503-507,426-428`; failing band-aid `style.css:213-219`.
- Fix idea: `.prose-v3[contenteditable='false'] p:empty { min-height: 1.7em }`.

### E10 — Code block can't nest in a list item · `fui` · VERIFIED
Slash/toolbar uses `toggleCodeBlock()` → `setBlockType`, which retypes the list item's paragraph instead of inserting a nested code block. (A `setCodeBlockSmart` attempt was tried this round and **reverted — it didn't work**.)
- Location: `slash-commands-extension.ts:72-73`; `code-block/code-block.ts`; `shared/toggle-code-shortcut.ts`.

### E7 — Two side-by-side images render wonky · `fui` · VERIFIED (structural)
Image node is declared `inline:true` but its node view renders block chrome (`mx-auto`, `block max-w-full`). Two inline images on one line fight each other.
- Location: `extensions/image/image-extension.ts:80-84`; `MediaNodeView.vue:218-225`.
- Fix idea: route side-by-side through the `imageGroup` gallery node. **Highest rework-conflict risk.**

### E8 — Caption clicks dead / one caption copied to all · `fui` · VERIFIED / LIKELY
Caption `<input>` is inside an inline draggable leaf node view with no `stopEvent`, so pointerdown triggers drag/selection instead of focus. Shared-caption likely from inline node-view reuse showing stale `alt`. Same root cause as E7.
- Location: `MediaNodeView.vue:349-358,62-74,146-148`.

### M4 — Video auto-rotates on fullscreen (Android) · `fui` · LIKELY
Mostly Android Chrome default. App fullscreens the wrapper div; no orientation lock.
- Location: `components/VideoControls.vue:91-101`; `MediaNodeView.vue:251-264`.
- Fix idea: guarded `screen.orientation?.lock('portrait')` after `requestFullscreen()` (iOS won't honor it).

---

## Dark mode

### D1 — Uploaded images darkened in dark mode · `fui` · VERIFIED
Blanket `[data-theme='dark'] img { filter: brightness(.8) contrast(1.2) }` darkens user uploads too.
- Location: `frappe-ui/tailwind/plugin.js:201-203`.
- Fix: remove/scope the rule away from prose images. **Upstream PR #630 covers this** — patch the vendored copy.

### D2 — "New comments" divider dark-mode contrast · `gp` · LIKELY
Divider uses raw `border-blue-600` (`#2563eb`), not a theme token → dim on near-black.
- Location: `frontend/src/components/CommentsList.vue:24-35`. Fix: `border-outline-blue-2`/theme token.

---

## Mobile / layout — gameplan

### E11 — List/bio width ≠ post width · `gp` · VERIFIED
List/profile use `.body-container` (`max-w-[940px]`); post detail uses `.discussion-container` (~760px).
- Location: `frontend/src/index.css:43-51`. Fix via a scoped class — **don't** edit shared `.body-container` (~18 pages).

### E12 — User hover-card not espresso-styled · `gp` · VERIFIED
Built on reka-ui HoverCard with popover look instead of the espresso tooltip bubble.
- Location: `frontend/src/components/UserHoverCard.vue:8-10`.

### M1 — Poll options centered on mobile · `gp` · VERIFIED
Option button is `flex items-center` with no `w-full`/`text-left`; long titles wrap and center.
- Location: `frontend/src/components/Poll.vue:59-84`. Fix: add `w-full text-left items-start`.

### M2 — Select-to-reply broken on phone · `gp` · VERIFIED
Quote button clears `isPointerDown` on `pointerup`, but Android long-press fires `pointercancel` (no handler) → flag stuck → evaluation always bails.
- Location: `frontend/src/components/RichQuoteExtension/QuoteReplyButton.vue:61,81-101`.
- Fix: drive from document `selectionchange` (debounced); handle `pointercancel`/`touchend`.

### M3 — Theme flips on video fullscreen · `gp`+`fui` · VERIFIED
`'system'` theme registers a `matchMedia` listener; Android fullscreen re-fires it → theme flips. Worsened by non-singleton `ref` + leaked listener (cleanup returned from `onMounted`, ignored by Vue).
- Location: `frontend/src/utils/useTheme.ts:36-58`; mount `UserDropdown.vue:16`.

---

## Backend / drafts — gameplan

### R1 — Reacting marks a comment "Edited" · `gp` (backend) · VERIFIED
`validate()` re-runs `sanitize_content()` which normalizes legacy HTML; `set_edited_at` then sees `content` changed and stamps `edited_at`. Reacting calls `save()` → triggers it. (Legacy/un-normalized content only.)
- Location: `gameplan/.../gp_comment/gp_comment.py:45-47,64-79`; `mixins/reactions.py:41`.
- Fix: compare sanitized-vs-sanitized in `set_edited_at` (treat normalization-only deltas as non-edits).

### O2 — Quoting a paragraph that @mentions you re-notifies · `gp` (backend) · VERIFIED
Rich-quote copies the live mention span into the new comment; `extract_mentions` scans the whole body **incl. the blockquote** → fires a fresh "mentioned you".
- Location: `gameplan/utils/utils.py:24-31`; `mixins/mentions.py:12-36`.
- Fix: decompose `blockquote[data-rich-quote-id]` before collecting mention spans.

### O1 — "Save draft" button does nothing · `gp` (frontend) · VERIFIED
(A) drafts already autosave + manual save has **no toast** → looks dead; (B) true no-op: button shows on `isDraftChanged` but `performAutoSave` bails unless a draft exists or a space is selected.
- Location: `frontend/src/pages/NewDiscussion/DiscussionHeader.vue:23-27`; `useNewDiscussion.ts:66-131` (delete dead `useAutoSave.ts`).

---

## On hold

### R2 — Reacting adds my name to the list view · UNCONFIRMED
Does not reproduce on `feature/community`. Need the build/branch the screenshot came from, or a repro discussion ID.
