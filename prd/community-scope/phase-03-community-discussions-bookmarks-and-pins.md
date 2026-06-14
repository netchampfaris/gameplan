# Phase 03 — Community discussions, bookmarks, and pins

Status: done
Commit checkpoint: `b188f357`
Notes:
- `Bookmarks` was promoted to a top-level destination rather than a re-imported tab — the `PersonProfile` Bookmarks tab was removed entirely (only the session user could see it), and `/people/:id/bookmarks` now redirects to `/bookmarks`.
- Profile-side cleanup also removed `'PersonProfileBookmarks'` from `AppRail` and `MobileLayout` active-route checks.
- `Discussions.vue` was further simplified after the initial scope: feed-specific navbar title (`All Discussions` / `Unread` / `Participating`) driven by `feedType`, and the sort selector moved into the page header.
- `SpaceBreadcrumbs` dropped the leading community crumb — the `AppSidebar` already conveys community context.
- Decisions locked before implementation:
  1. Route shape: keep the single `DiscussionsTab` route at `/community/:communityId/discussions/:feedType`. `feedType` is a filter param, not a separate route name.
  2. `following` feed is removed from the UI and from the URL allow-list. `discussionFeeds` drops `'following'`; any incoming `:feedType` not in the allow-list redirects to `recent`. The backend `following` handler stays for backward compatibility.
   3. `pin_scope` union widens to `'Global' | 'Category' | 'Space'`. New writes use persisted `'Category'` for community pins; existing `'Global'` rows remain readable until Phase 08.
  4. `GP Discussion.team` is a denormalized copy of `project.team`. It has no `fetch_from` today and is only set in `move_discussion`, so legacy rows may carry null `team`. Phase 08 adds `fetch_from: "project.team"` (auto-populates new/edited rows) **and** backfills existing rows. Do not assume `team` is already populated.
  5. Legacy route names (`ProjectDiscussion`, `ProjectDiscussions`, `TeamDiscussions`) get redirect entries in `router.ts` to the new scoped routes. The legacy `.vue` files stay until Phase 09/follow-up cleanup.
- Drafts is not a feed type. Drop `'drafts'` from `FeedType` in `Discussions.vue`; `/drafts` keeps its own route.
- Bookmarks page: rename `frontend/src/pages/PersonProfileBookmarks.vue` → `Bookmarks.vue`, add a page header, repoint the `/bookmarks` route from `ComingSoon.vue` to it. Profile re-imports from the new location.
- Cache key shape includes `communityId` and `feedType` for community feeds; bookmarks gets its own key.
- Phase 04 updates active route params/cache-key variables to `communityId` naming while still filtering backend data with the schema field `team`.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Convert the discussions experience from global to community-scoped, while moving bookmarks to their own global route.

This phase should deliver:
- community discussions under `/community/:communityId/discussions` and `/community/:communityId/discussions/:feedType` (single `DiscussionsTab` route).
- feed types limited to `recent` / `unread` / `participating` — `following` removed from the URL allow-list and the type union.
- global bookmarks page (promoted out of the user profile).
- community-vs-space pin behavior, with read compatibility for legacy `'Global'` pins.
- redirects from legacy route names so existing links keep working until Phase 09 cleanup/follow-up deletes the old pages.

---

## Files

### Rename
- `frontend/src/pages/PersonProfileBookmarks.vue` → `frontend/src/pages/Bookmarks.vue`

### Edit
- `frontend/src/pages/Discussions.vue` — read `feedType` from route params, drop the in-page tab strip, drop `following` and `drafts` from the `FeedType` union, update cache key to include `communityId`
- `frontend/src/router.ts` — drop `'following'` from `discussionFeeds`; add redirects for legacy route names (`ProjectDiscussion`, `ProjectDiscussions`, `TeamDiscussions`) → new scoped routes; repoint `/bookmarks` from `ComingSoon.vue` to the new `Bookmarks.vue`; update profile sub-route that pointed at `PersonProfileBookmarks.vue`
- `frontend/src/components/DiscussionList.vue` — pin scope branching (`Space` for space lists, persisted `Category` for community lists); cache key includes `communityId` when community-scoped
- `frontend/src/components/DiscussionView.vue` — replace "Pin Globally" copy with "Pin to Community"; write `pin_scope: 'Category'` instead of `'Global'`; keep the `=== 'Global'` read path so legacy pins still render
- `frontend/src/components/DiscussionRow.vue`, `frontend/src/components/DiscussionBreadcrumbs.vue` — route params include `communityId`; breadcrumb root is community discussions
- `frontend/src/types/doctypes.ts` — widen `pin_scope` to `'Global' | 'Category' | 'Space'`
- `frontend/src/data/discussions.ts` — same widening for `pinDiscussion` parameter type

---

## Tasks

### 1. Repurpose Discussions page as community discussions
In `frontend/src/pages/Discussions.vue`:
- read `communityId` and `feedType` from route **params** (single `DiscussionsTab` route at `/community/:communityId/discussions/:feedType`; the canonical `Discussions` route at `/community/:communityId/discussions` is treated as `feedType: 'recent'`).
- pass `team: communityId` and `feed_type` into filters.
- **remove the tab strip entirely** — the sidebar (Phase 02) drives feed selection now.
- drop `'following'` and `'drafts'` from the `FeedType` union. The backend `following` handler still exists; we just no longer surface or accept it from the URL.
- update the in-page "+ New discussion" button (the only entry point for new-discussion creation) to route to scoped `NewDiscussion` with `communityId`.
- cache key shape includes `communityId` and `feedType`.
- change `routeName` from `ProjectDiscussion` to `Discussion` with `communityId` + `spaceId` params.

Backend note: the `following` feed_type handler in `gameplan/gameplan/doctype/gp_discussion/api.py` **must be kept** for backward compatibility and potential future use — only the frontend tab + URL allow-list entry are removed.

### 2. Promote Bookmarks page out of the profile
- Rename `frontend/src/pages/PersonProfileBookmarks.vue` → `frontend/src/pages/Bookmarks.vue`. The existing template (`<DiscussionList :filters="{ feed_type: 'bookmarks' }" :show-pinned="false" />`) is already what we want — add a page header on top.
- Repoint the `/bookmarks` route in `router.ts` from `ComingSoon.vue` to the new `Bookmarks.vue`.
- Update the profile route that previously imported `PersonProfileBookmarks.vue` to import from the new location, or fold the profile bookmarks tab into `Bookmarks.vue` if the profile context isn't doing anything different.
- Use a cache key that does **not** include `communityId` (bookmarks must remain global).

### 3. Update pin behavior in DiscussionList
In `frontend/src/components/DiscussionList.vue`:
- if list is scoped to a space -> pinned list should use `pin_scope: 'Space'`.
- if list is community discussions -> pinned list should use `pin_scope: 'Category'`.
- remove assumptions about a global discussion feed.
- update `pinnedDiscussions` cache key to include `communityId` when scoped by community.

### 4. Update pin UI copy and scope in DiscussionView
In `frontend/src/components/DiscussionView.vue`:
- replace "Pin Globally" language with "Pin to Community".
- write `pin_scope: 'Category'` instead of `'Global'`.
- keep the read path that checks `=== 'Global'` so legacy pinned rows still render correctly until the Phase 08 backfill flips them to `'Category'`.
- keep `Space` pin behavior unchanged.

### 5. Widen pin_scope union and add legacy route redirects
- In `frontend/src/types/doctypes.ts`, widen `pin_scope?: 'Global' | 'Space'` to `'Global' | 'Category' | 'Space'`. Mirror the same change in `frontend/src/data/discussions.ts` (`pinDiscussion` parameter type).
- In `frontend/src/router.ts`, drop `'following'` from `discussionFeeds` so `/discussions/following` and `/community/:communityId/discussions/following` redirect to `recent`.
- Add redirects from legacy route names to new ones:
  - `ProjectDiscussion` → `Discussion` (`communityId` + `spaceId`)
  - `ProjectDiscussions` / `TeamDiscussions` → community-scoped `Discussions`
- Do **not** delete `frontend/src/pages/ProjectDiscussion.vue`, `ProjectDiscussions.vue`, or `TeamDiscussions.vue` in this phase — Phase 09/follow-up handles file deletion once nothing imports them.

### 6. Update route params on discussion row / breadcrumbs
In:
- `frontend/src/components/DiscussionRow.vue`
- `frontend/src/components/DiscussionBreadcrumbs.vue`

Ensure:
- routes into discussions include `communityId`
- breadcrumb root is community discussions, not old Team/Project routes

---

## Guardrails

- Bookmarks must remain global. Do not include `communityId` in the bookmarks cache key or filters.
- Do not change search/task/page behavior in this phase.
- Do not delete `ProjectDiscussion.vue`, `ProjectDiscussions.vue`, or `TeamDiscussions.vue` — only their route names get redirected. File cleanup is Phase 09/follow-up.
- Existing pinned discussions with `pin_scope: 'Global'` must still render; the read path stays compatible.
- The `team` backfill belongs to Phase 08 (which adds `fetch_from: "project.team"` plus a one-time backfill of existing rows). Do not add a separate backfill here in Phase 03, and do not assume `team` is already populated.

---

## Verify before commit

- `/community/:communityId/discussions` loads discussions only for that community.
- `/community/:communityId/discussions/recent`, `.../unread`, `.../participating` resolve via the single `DiscussionsTab` route.
- `/community/:communityId/discussions/following` redirects to `.../recent`.
- `/discussions/following` (legacy unscoped) also redirects to `.../recent` under the active community.
- `/bookmarks` works and stays global; profile bookmarks link still resolves.
- Community discussions show only community pins; space discussions show only space pins; legacy `'Global'` pins still render until Phase 08 backfill.
- Discussion links and breadcrumbs include the correct `communityId`.
- Hitting an old `ProjectDiscussion` / `ProjectDiscussions` / `TeamDiscussions` URL routes through to the new scoped equivalent.

---

## Suggested commit checkpoint

`feat(community): scope discussions by community and split out bookmarks`
