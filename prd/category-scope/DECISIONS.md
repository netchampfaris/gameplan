# Category-Scoped Collaboration: Reference

This file contains product decisions, strategy principles, and agent guidance that apply across all phases.

For active implementation, use the phase files listed in `./PLAN.md`.

---

## 1. Product decisions

### Collaboration model
- There is **no global discussions feed** anymore.
- `GP Team` becomes the required top-level collaboration scope and is called **Category** in the UI.
- The app shell always has a **current Category**.
- The selected Category is explicit in canonical collaboration URLs.

### Category-scoped surfaces
- Category discussions
- Sidebar spaces list
- Space routes
- New discussion
- New space
- Onboarding

### Global surfaces (stay global in v1)
- `/spaces`, `/search`, `/bookmarks`, `/notifications`, `/drafts`, `/tasks`, `/pages`, `/people`
- command palette

### Route behavior
- `/` and `/home` resolve to last selected accessible category, else first accessible category, else onboarding.
- `/c/:teamId` redirects to `/c/:teamId/discussions`.
- Deep links define scope. If a link points to another category, the app switches to that category automatically.
- `/discussions` redirects to the current selected category, or first accessible category.

### Feed types
- Keep only: `recent`, `unread`, `participating`
- `following` removed from frontend only; backend handler kept intact.

### Bookmarks
- Global at `/bookmarks`. In sidebar. Removed from category feed tabs.

### New discussion + drafts
- Canonical create route is category-scoped.
- Legacy drafts without space/category still supported via `/new-discussion?draft=...`.
- New drafts must not be created until a space has been selected.

### Spaces
- All spaces must belong to a category. Migration creates `Default` for uncategorized.
- `/spaces` stays global, used for housekeeping.
- Non-admins (`Gameplan Member`, `Gameplan Guest`) get read-only `/spaces` view.
- Admins (`Gameplan Admin` role) keep existing actions. Do not expand or reduce.
- Do not change move-space implementation.

### Pin scope
- Rename `Global` → `Category`. Category discussions show `Category` pins. Space discussions show `Space` pins.

### Category switcher
- Hide when only one active category exists.

### All-archived fallback
- Admin (`Gameplan Admin`) → redirect to `/spaces`. Non-admin → helpful empty state. No onboarding.

---

## 2. Strategy principles

### Preserve route names
Keep existing named routes for canonical collaboration screens. Change paths/params, not names.

Canonical names to keep: `Discussions`, `DiscussionsTab`, `Space`, `SpaceDiscussions`, `SpacePages`, `SpacePage`, `SpaceTasks`, `SpaceTask`, `Discussion`, `NewDiscussion`

New names: `Bookmarks`, `LegacyNewDiscussion`

### Do not repurpose global helpers for scoped use
Keep `groupedSpaces.ts` for global UIs (`/spaces`, search filters, task/page dialogs). Add new `categorySpaces.ts` for scoped use.

### Avoid deleting old files in the first pass
Old Team/Project pages: stop routing to them, keep as redirect compatibility, delete later after routing is stable.

---

## 3. Important constraints for agents

### Do not accidentally break
- Legacy unscoped drafts
- `/spaces` admin behaviors
- Global search/tasks/pages/people/notifications behavior
- Guest access filtering

### Keep this distinction clear in code
- **current category context** is a shell concept
- **global page content** is still cross-category in v1

Do not over-scope global pages just because the shell now has a selected category.

### Safe first milestone
If splitting work, land these first:
1. `currentCategory.ts`
2. Router changes for `/c/:teamId/...`
3. AppSidebar rewrite
4. Category discussions page changes
5. `/bookmarks`

This gives the new information architecture before touching onboarding and migrations.
