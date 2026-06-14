# Community-Scoped Collaboration: Reference

This file contains product decisions, strategy principles, and agent guidance that apply across all phases.

For active implementation, use the phase files listed in `./PLAN.md`.

---

## 1. Product decisions

Product and active frontend app language: the top-level entity is **Community**. The nested entity is **Space**.
Backend/schema identifiers such as `GP Team`, document fields named `team`, and `pin_scope: 'Category'`
remain as-is until a separate schema/API rename is explicitly planned.

### Collaboration model
- There is **no global discussions feed** anymore.
- `GP Team` becomes the required top-level collaboration scope and is called **Community** in the UI.
- The app shell always has a **current Community**.
- The selected Community is explicit in canonical collaboration URLs as `communityId`.

### Community-scoped surfaces
- Community discussions
- Sidebar spaces list
- Space routes
- New discussion
- New space
- Onboarding

### Global surfaces (stay global in v1)
- `/spaces`, `/search`, `/bookmarks`, `/notifications`, `/drafts`, `/tasks`, `/pages`, `/people`
- command palette

### Route behavior
- `/` and `/home` resolve to last selected accessible community, else first accessible community, else onboarding.
- `/community/:communityId` redirects to `/community/:communityId/discussions`.
- Deep links navigate to the target community but **do not** silently overwrite the persisted current community. Persistence updates only on deliberate switches (rail switcher click, sidebar click, explicit community nav). This avoids notification clicks rewriting "home" for the user.
- `/discussions` redirects to the current selected community, or first accessible community.

### Feed types
- Keep only: `recent`, `unread`, `participating`.
- These are surfaced as **rows in the community sidebar** ("All discussions", "Unread", "Participating"), not as a tab strip on the discussions page. The discussions page renders the list for whichever feed type the route specifies.
- Routes: a single `DiscussionsTab` named route at `/community/:communityId/discussions/:feedType` plus the canonical `Discussions` route at `/community/:communityId/discussions` (treated as `feedType: 'recent'`). `feedType` is a filter param, not a separate route name.
- `following` removed from the frontend (URL allow-list and `FeedType` union); backend handler kept intact for backward compatibility. Any incoming `:feedType` outside the allow-list redirects to `recent`.

### Bookmarks
- Global at `/bookmarks`. Top-level destination in the narrow rail. Removed from community feed tabs.

### New discussion + drafts
- Canonical create route is community-scoped.
- The "+ New discussion" entry point lives **only inside the community discussions list** (and inline shell affordances scoped to the current community). The global `/drafts` page is a pure list of existing drafts — no "+ New" button.
- Legacy drafts without space/community still supported via `/new-discussion?draft=...`.
- New drafts must not be created until a space has been selected.
- Command palette "Add discussion" entry point is **deferred** to a follow-up — out of scope for this branch.

### Spaces
- All spaces must belong to a community.
- `/spaces` stays as an **admin-only** global page for housekeeping. Non-admins are redirected away (route guard) and the rail icon is hidden for them.
- Admins (`Gameplan Admin` role) keep existing actions. Do not expand or reduce. Admin check uses the codebase convention `useSessionUser().role === 'Gameplan Admin'` (the `UserInfo` model has a singular `role` field, not a `roles` array), matching `AppRail.vue` / `AppSidebar.vue` / `MobileMoreMenu.vue`.
- Do not change move-space implementation.

### Migration of uncategorized spaces (existing sites only)
- Fresh sites: no `Default` is created. Onboarding requires the user to name a community.
- Existing sites that have spaces with empty `team`: migration creates a `Default` community and assigns those orphans to it. This handles the "site already has data but no communities" case.
- Migration is a no-op on sites that already have all spaces assigned to communities.

### Pin scope
- Frontend `pin_scope` union widens to `'Global' | 'Category' | 'Space'`. New writes use persisted value `'Category'` for community-level pins; `'Space'` is unchanged.
- Read path keeps the `=== 'Global'` branch so legacy pinned rows still render until Phase 08's migration flips `'Global'` → `'Category'` in the database. After Phase 08, the `'Global'` read branch **and** the widened type union can be dropped in Phase 09 cleanup.
- Community discussions show `Category` pins (and any remaining legacy `Global` pins). Space discussions show `Space` pins.

### Discussion team field
- `GP Discussion.team` is a denormalized copy of `project.team`. It currently has no `fetch_from` and is only set in `move_discussion`, so legacy rows may carry null `team`.
- Phase 08 adds `fetch_from: "project.team"` (auto-populates new/edited rows) and backfills existing rows. The community discussions feed filters on `team`, so this is load-bearing — an empty `team` means the discussion is invisible in every community feed.

### Active frontend naming
- Active app-layer code uses Community naming: `communityState`, `communities`, `activeCommunities`, `getCommunity`, `getActiveCommunity`, `communitySpaces`, and canonical route param `communityId`.
- `communityState` stores only the deliberately selected/default community. It is not updated by deep links.
- Scoped routes display the community from `route.params.communityId`. This route-effective community may differ from the persisted default community.
- Do not add app-layer compatibility shims for old names (`activeCategory`, `categorySpaces`, old localStorage keys). This branch has not shipped.
- Rename active components/modules on the current community path. Do not rename legacy Team/Project route pages retained only for compatibility.
- Delete unused stale `Category*` files if they have zero imports and are not legacy compatibility pages.

### Community switcher
- Triggered by clicking the community icon at the top of the narrow rail.
- Implemented as a combobox with custom trigger slot (searchable list, scrollable).
- When only one active community exists, the rail-top icon becomes a static badge (no click handler, no chevron). The community-name dropdown in the community sidebar still works (it carries community-level actions, which exist regardless of community count).

### Auto-create `General` space
- Every newly created `GP Team` (Community) gets a `General` space auto-created via `after_insert` on `GP Team`. This guarantees every community has at least one valid landing destination and removes a class of empty-state edge cases from the routing layer.
- `General` is a **public** space (`is_private = 0`) that all members of the site/community can see by default. The hook should not insert per-member ACL rows for `General`; access derives from publicness.
- Idempotency rule: skip auto-create if **any** `GP Project` already exists in this team (broader than checking for "General" by name). This makes the migration path safe.
- During onboarding the hook fires first (creating `General`), then onboarding additionally creates the user-named first space. New communities created via onboarding therefore land with two spaces: `General` + user-named.

### All-archived fallback
- Admin (`Gameplan Admin`) → redirect to `/spaces`. Non-admin → inline empty state rendered inside the shell on `/` ("No communities available. Ask an admin."). Not a dedicated route. No onboarding.

---

### Shell information architecture

#### Desktop layout (three columns)
- **Narrow rail** (≈52px, gray bg). Top: community icon (28px) — opens the community-switcher combobox. Below, in three groups separated by dividers:
  - Group 1: Home, Inbox, Search.
  - Group 2: Drafts, Bookmarks, Tasks, Pages.
  - Group 3: People, Spaces *(Spaces icon shown only to admins — `Gameplan Admin` role)*.
  - Bottom: user avatar (`UserDropdown`).
- **Community sidebar** (`w-56`, white bg). Top row = community name (text), opens the app/community menu for community-level actions. Aligned horizontally with the rail's community icon to read as one composite header. Below in order:
  - "All discussions" row → `/community/:communityId/discussions`
  - "Unread" row → `/community/:communityId/discussions/unread`
  - "Participating" row → `/community/:communityId/discussions/participating`
  - "Spaces" header with a hover/focus-revealed `+` (admin only) opening the new-space flow
  - Spaces list
  - No persistent footer.
- **Content area** fills the remaining width.

#### Sidebar visibility
- Community sidebar visible only on `/community/:communityId/*` routes.
- Hidden on global routes (`/search`, `/people`, `/pages`, `/tasks`, `/bookmarks`, `/notifications`, `/drafts`, `/spaces`); content area expands. Width transition animated (~150ms).

#### Active-state semantics
- Active = "this is the destination the user is currently on", not "this destination is in the user's context".
- Rail community icon: active only on `/community/:communityId/*` routes.
- Rail destination icons: active only when on the route they target.
- Sidebar "All discussions" / space rows: active only on the exact destination.

#### Search rail icon
- Click → navigate to `/search` page.
- `Cmd+K` continues to open `CommandPalette` overlay. Both behaviors preserved.

#### Visual identity
- Community icon: existing `team.icon` emoji, fallback to first character of title. Container designed for future image swap (no new field in v1).
- Space rows in sidebar: leading `lucide-globe` for public spaces, `lucide-lock` for private spaces. No emoji on space rows. Title + unread count follow the leading icon.

#### Empty state
- If a community has zero spaces (rare due to auto-create `General`): empty message "No spaces in this community yet." Admins additionally see a "Create a space" CTA opening the new-space flow.

#### Mobile (drill-down per tab; no two-column layout)
- Bottom tabs: **Home, Inbox, Search, More**.
- Home tab: top bar = community name + switcher. Body = "All discussions" row + spaces list. Tap a space → drill into space discussions (tab bar persistent).
- Other tabs: no community context at top. Just destination content.
- More tab: full-page menu of Bookmarks, People, Pages, Tasks, Drafts, *Spaces (admin only)*, plus user avatar/settings at the bottom.

---

## 2. Strategy principles

### Preserve route names
Keep existing named routes for canonical collaboration screens. Change paths/params, not names.

Canonical names to keep: `Discussions`, `DiscussionsTab`, `Space`, `SpaceDiscussions`, `SpacePages`, `SpacePage`, `SpaceTasks`, `SpaceTask`, `Discussion`, `NewDiscussion`

New names: `Bookmarks`, `LegacyNewDiscussion`

### Do not repurpose global helpers for scoped use
Keep global helper modules for global UIs (`/spaces`, search filters, task/page dialogs) unless they are on an active community code path. Use `communitySpaces` naming for community-scoped space filtering.

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
- **current community context** is a shell concept
- **global page content** is still cross-community in v1

Do not over-scope global pages just because the shell now has a selected community.

### Safe first milestone
If splitting work, land these first:
1. `communityState.ts`
2. Router changes for `/community/:communityId/...`
3. AppSidebar rewrite
4. Community discussions page changes
5. `/bookmarks`

This gives the new information architecture before touching onboarding and migrations.
