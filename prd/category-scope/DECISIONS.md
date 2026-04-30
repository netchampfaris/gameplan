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
- Deep links navigate to the target category but **do not** silently overwrite the persisted current category. Persistence updates only on deliberate switches (rail switcher click, sidebar click, explicit category nav). This avoids notification clicks rewriting "home" for the user.
- `/discussions` redirects to the current selected category, or first accessible category.

### Feed types
- Keep only: `recent`, `unread`, `participating`
- These are surfaced as **rows in the category sidebar** ("All discussions", "Unread", "Participating"), not as a tab strip on the discussions page. The discussions page renders the list for whichever feed type the route specifies.
- Routes: `/c/:teamId/discussions` (recent), `/c/:teamId/discussions/unread`, `/c/:teamId/discussions/participating`.
- `following` removed from frontend only; backend handler kept intact.

### Bookmarks
- Global at `/bookmarks`. Top-level destination in the narrow rail. Removed from category feed tabs.

### New discussion + drafts
- Canonical create route is category-scoped.
- The "+ New discussion" entry point lives **only inside the category discussions list** (and inline shell affordances scoped to the current category). The global `/drafts` page is a pure list of existing drafts — no "+ New" button.
- Legacy drafts without space/category still supported via `/new-discussion?draft=...`.
- New drafts must not be created until a space has been selected.
- Command palette "Add discussion" entry point is **deferred** to a follow-up — out of scope for this branch.

### Spaces
- All spaces must belong to a category.
- `/spaces` stays as an **admin-only** global page for housekeeping. Non-admins are redirected away (route guard) and the rail icon is hidden for them.
- Admins (`Gameplan Admin` role) keep existing actions. Do not expand or reduce. Admin check uses `user.roles.includes('Gameplan Admin')`.
- Do not change move-space implementation.

### Migration of uncategorized spaces (existing sites only)
- Fresh sites: no `Default` is created. Onboarding requires the user to name a category.
- Existing sites that have spaces with empty `team`: migration creates a `Default` category and assigns those orphans to it. This handles the "site already has data but no teams" case.
- Migration is a no-op on sites that already have all spaces categorized.

### Pin scope
- Rename `Global` → `Category`. Category discussions show `Category` pins. Space discussions show `Space` pins.

### Category switcher
- Triggered by clicking the category icon at the top of the narrow rail.
- Implemented as a combobox with custom trigger slot (searchable list, scrollable).
- When only one active category exists, the rail-top icon becomes a static badge (no click handler, no chevron). The category-name dropdown in the category sidebar still works (it carries category-level actions, which exist regardless of category count).

### Auto-create `General` space
- Every newly created `GP Team` (Category) gets a `General` space auto-created via `after_insert` on `GP Team`. This guarantees every category has at least one valid landing destination and removes a class of empty-state edge cases from the routing layer.
- `General` is a **public** space (`is_private = 0`) that all members of the site/category can see by default. The hook should not insert per-member ACL rows for `General`; access derives from publicness.
- Idempotency rule: skip auto-create if **any** `GP Project` already exists in this team (broader than checking for "General" by name). This makes the migration path safe.
- During onboarding the hook fires first (creating `General`), then onboarding additionally creates the user-named first space. New categories created via onboarding therefore land with two spaces: `General` + user-named.

### All-archived fallback
- Admin (`Gameplan Admin`) → redirect to `/spaces`. Non-admin → inline empty state rendered inside the shell on `/` ("No categories available. Ask an admin."). Not a dedicated route. No onboarding.

---

### Shell information architecture

#### Desktop layout (three columns)
- **Narrow rail** (≈52px, gray bg). Top: category icon (28px) — opens the category-switcher combobox. Below, in three groups separated by dividers:
  - Group 1: Home, Inbox, Search.
  - Group 2: Drafts, Bookmarks, Tasks, Pages.
  - Group 3: People, Spaces *(Spaces icon shown only to admins — `Gameplan Admin` role)*.
  - Bottom: user avatar (`UserDropdown`).
- **Category sidebar** (`w-56`, white bg). Top row = category name (text), opens `CategoryDropdown` for category-level actions. Aligned horizontally with the rail's category icon to read as one composite header. Below in order:
  - "All discussions" row → `/c/:teamId/discussions`
  - "Unread" row → `/c/:teamId/discussions/unread`
  - "Participating" row → `/c/:teamId/discussions/participating`
  - "Spaces" header with a hover/focus-revealed `+` (admin only) opening the new-space flow
  - Spaces list
  - No persistent footer.
- **Content area** fills the remaining width.

#### Sidebar visibility
- Category sidebar visible only on `/c/:teamId/*` routes.
- Hidden on global routes (`/search`, `/people`, `/pages`, `/tasks`, `/bookmarks`, `/notifications`, `/drafts`, `/spaces`); content area expands. Width transition animated (~150ms).

#### Active-state semantics
- Active = "this is the destination the user is currently on", not "this destination is in the user's context".
- Rail category icon: active only on `/c/:teamId/*` routes.
- Rail destination icons: active only when on the route they target.
- Sidebar "All discussions" / space rows: active only on the exact destination.

#### Search rail icon
- Click → navigate to `/search` page.
- `Cmd+K` continues to open `CommandPalette` overlay. Both behaviors preserved.

#### Visual identity
- Category icon: existing `team.icon` emoji, fallback to first character of title. Container designed for future image swap (no new field in v1).
- Space rows in sidebar: leading `lucide-globe` for public spaces, `lucide-lock` for private spaces. No emoji on space rows. Title + unread count follow the leading icon.

#### Empty state
- If a category has zero spaces (rare due to auto-create `General`): empty message "No spaces in this category yet." Admins additionally see a "Create a space" CTA opening the new-space flow.

#### Mobile (drill-down per tab; no two-column layout)
- Bottom tabs: **Home, Inbox, Search, More**.
- Home tab: top bar = category name + switcher. Body = "All discussions" row + spaces list. Tap a space → drill into space discussions (tab bar persistent).
- Other tabs: no category context at top. Just destination content.
- More tab: full-page menu of Bookmarks, People, Pages, Tasks, Drafts, *Spaces (admin only)*, plus user avatar/settings at the bottom.

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
1. `activeCategory.ts`
2. Router changes for `/c/:teamId/...`
3. AppSidebar rewrite
4. Category discussions page changes
5. `/bookmarks`

This gives the new information architecture before touching onboarding and migrations.
