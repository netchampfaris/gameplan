# Phase 03 — Category discussions, bookmarks, and pins

Status: done
Commit checkpoint: `b188f357 feat(category-scope): scope discussions by category and split out bookmarks`
Notes:
- `Bookmarks` was promoted to a top-level destination rather than a re-imported tab — the `PersonProfile` Bookmarks tab was removed entirely (only the session user could see it), and `/people/:id/bookmarks` now redirects to `/bookmarks`.
- Profile-side cleanup also removed `'PersonProfileBookmarks'` from `AppRail` and `MobileLayout` active-route checks.
- `Discussions.vue` was further simplified after the initial scope: feed-specific navbar title (`All Discussions` / `Unread` / `Participating`) driven by `feedType`, and the sort selector moved into the page header.
- `SpaceBreadcrumbs` dropped the leading category crumb — the `AppSidebar` already conveys category context.
- Decisions locked before implementation:
  1. Route shape: keep the single `DiscussionsTab` route at `/c/:teamId/discussions/:feedType`. `feedType` is a filter param, not a separate route name.
  2. `following` feed is removed from the UI and from the URL allow-list. `discussionFeeds` drops `'following'`; any incoming `:feedType` not in the allow-list redirects to `recent`. The backend `following` handler stays for backward compatibility.
  3. `pin_scope` union widens to `'Global' | 'Category' | 'Space'`. New writes use `'Category'` for category pins; existing `'Global'` rows remain readable until Phase 07.
  4. No `team` backfill required. `GP Discussion.team` is populated for all rows.
  5. Legacy route names (`ProjectDiscussion`, `ProjectDiscussions`, `TeamDiscussions`) get redirect entries in `router.js` to the new scoped routes. The legacy `.vue` files stay until Phase 08.
- Drafts is not a feed type. Drop `'drafts'` from `FeedType` in `Discussions.vue`; `/drafts` keeps its own route.
- Bookmarks page: rename `frontend/src/pages/PersonProfileBookmarks.vue` → `Bookmarks.vue`, add a page header, repoint the `/bookmarks` route from `ComingSoon.vue` to it. Profile re-imports from the new location.
- Cache key shape: `Discussions-${teamId}-${feedType}` for category feeds; bookmarks gets its own key.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Convert the discussions experience from global to category-scoped, while moving bookmarks to their own global route.

This phase should deliver:
- category discussions under `/c/:teamId/discussions` and `/c/:teamId/discussions/:feedType` (single `DiscussionsTab` route).
- feed types limited to `recent` / `unread` / `participating` — `following` removed from the URL allow-list and the type union.
- global bookmarks page (promoted out of the user profile).
- category-vs-space pin behavior, with read compatibility for legacy `'Global'` pins.
- redirects from legacy route names so existing links keep working until Phase 08 deletes the old pages.

---

## Files

### Rename
- `frontend/src/pages/PersonProfileBookmarks.vue` → `frontend/src/pages/Bookmarks.vue`

### Edit
- `frontend/src/pages/Discussions.vue` — read `feedType` from route params, drop the in-page tab strip, drop `following` and `drafts` from the `FeedType` union, update cache key to `Discussions-${teamId}-${feedType}`
- `frontend/src/router.js` — drop `'following'` from `discussionFeeds`; add redirects for legacy route names (`ProjectDiscussion`, `ProjectDiscussions`, `TeamDiscussions`) → new scoped routes; repoint `/bookmarks` from `ComingSoon.vue` to the new `Bookmarks.vue`; update profile sub-route that pointed at `PersonProfileBookmarks.vue`
- `frontend/src/components/DiscussionList.vue` — pin scope branching (`Space` for space lists, `Category` for category lists); cache key includes `teamId` when category-scoped
- `frontend/src/components/DiscussionView.vue` — replace "Pin Globally" copy with "Pin to Category"; write `pin_scope: 'Category'` instead of `'Global'`; keep the `=== 'Global'` read path so legacy pins still render
- `frontend/src/components/DiscussionRow.vue`, `frontend/src/components/DiscussionBreadcrumbs.vue` — route params include `teamId`; breadcrumb root is category discussions
- `frontend/src/types/doctypes.ts` — widen `pin_scope` to `'Global' | 'Category' | 'Space'`
- `frontend/src/data/discussions.ts` — same widening for `pinDiscussion` parameter type

---

## Tasks

### 1. Repurpose Discussions page as category discussions
In `frontend/src/pages/Discussions.vue`:
- read `teamId` and `feedType` from route **params** (single `DiscussionsTab` route at `/c/:teamId/discussions/:feedType`; the canonical `Discussions` route at `/c/:teamId/discussions` is treated as `feedType: 'recent'`).
- pass `team: teamId` and `feed_type` into filters.
- **remove the tab strip entirely** — the sidebar (Phase 02) drives feed selection now.
- drop `'following'` and `'drafts'` from the `FeedType` union. The backend `following` handler still exists; we just no longer surface or accept it from the URL.
- update the in-page "+ New discussion" button (the only entry point for new-discussion creation) to route to scoped `NewDiscussion` with `teamId`.
- cache key shape: `Discussions-${teamId}-${feedType}`.
- change `routeName` from `ProjectDiscussion` to `Discussion` with `teamId` + `spaceId` params.

Backend note: the `following` feed_type handler in `gameplan/gameplan/doctype/gp_discussion/api.py` **must be kept** for backward compatibility and potential future use — only the frontend tab + URL allow-list entry are removed.

### 2. Promote Bookmarks page out of the profile
- Rename `frontend/src/pages/PersonProfileBookmarks.vue` → `frontend/src/pages/Bookmarks.vue`. The existing template (`<DiscussionList :filters="{ feed_type: 'bookmarks' }" :show-pinned="false" />`) is already what we want — add a page header on top.
- Repoint the `/bookmarks` route in `router.js` from `ComingSoon.vue` to the new `Bookmarks.vue`.
- Update the profile route that previously imported `PersonProfileBookmarks.vue` to import from the new location, or fold the profile bookmarks tab into `Bookmarks.vue` if the profile context isn't doing anything different.
- Use a cache key that does **not** include `teamId` (bookmarks must remain global).

### 3. Update pin behavior in DiscussionList
In `frontend/src/components/DiscussionList.vue`:
- if list is scoped to a space -> pinned list should use `pin_scope: 'Space'`.
- if list is category discussions -> pinned list should use `pin_scope: 'Category'`.
- remove assumptions about a global discussion feed.
- update `pinnedDiscussions` cache key to include `teamId` when scoped by category.

### 4. Update pin UI copy and scope in DiscussionView
In `frontend/src/components/DiscussionView.vue`:
- replace "Pin Globally" language with "Pin to Category".
- write `pin_scope: 'Category'` instead of `'Global'`.
- keep the read path that checks `=== 'Global'` so legacy pinned rows still render correctly until the Phase 07 backfill flips them to `'Category'`.
- keep `Space` pin behavior unchanged.

### 5. Widen pin_scope union and add legacy route redirects
- In `frontend/src/types/doctypes.ts`, widen `pin_scope?: 'Global' | 'Space'` to `'Global' | 'Category' | 'Space'`. Mirror the same change in `frontend/src/data/discussions.ts` (`pinDiscussion` parameter type).
- In `frontend/src/router.js`, drop `'following'` from `discussionFeeds` so `/discussions/following` and `/c/:teamId/discussions/following` redirect to `recent`.
- Add redirects from legacy route names to new ones:
  - `ProjectDiscussion` → `Discussion` (`teamId` + `spaceId`)
  - `ProjectDiscussions` / `TeamDiscussions` → category-scoped `Discussions`
- Do **not** delete `frontend/src/pages/ProjectDiscussion.vue`, `ProjectDiscussions.vue`, or `TeamDiscussions.vue` in this phase — Phase 08 handles file deletion once nothing imports them.

### 6. Update route params on discussion row / breadcrumbs
In:
- `frontend/src/components/DiscussionRow.vue`
- `frontend/src/components/DiscussionBreadcrumbs.vue`

Ensure:
- routes into discussions include `teamId`
- breadcrumb root is category discussions, not old Team/Project routes

---

## Guardrails

- Bookmarks must remain global. Do not include `teamId` in the bookmarks cache key or filters.
- Do not change search/task/page behavior in this phase.
- Do not delete `ProjectDiscussion.vue`, `ProjectDiscussions.vue`, or `TeamDiscussions.vue` — only their route names get redirected. File cleanup is Phase 08.
- Existing pinned discussions with `pin_scope: 'Global'` must still render; the read path stays compatible.
- Do not introduce a `team` backfill — `GP Discussion.team` is already populated for all rows.

---

## Verify before commit

- `/c/:teamId/discussions` loads discussions only for that category.
- `/c/:teamId/discussions/recent`, `.../unread`, `.../participating` resolve via the single `DiscussionsTab` route.
- `/c/:teamId/discussions/following` redirects to `.../recent`.
- `/discussions/following` (legacy unscoped) also redirects to `.../recent` under the active category.
- `/bookmarks` works and stays global; profile bookmarks link still resolves.
- Category discussions show only category pins; space discussions show only space pins; legacy `'Global'` pins still render until Phase 07 backfill.
- Discussion links and breadcrumbs include the correct `teamId`.
- Hitting an old `ProjectDiscussion` / `ProjectDiscussions` / `TeamDiscussions` URL routes through to the new scoped equivalent.

---

## Suggested commit checkpoint

`feat(category-scope): scope discussions by category and split out bookmarks`
