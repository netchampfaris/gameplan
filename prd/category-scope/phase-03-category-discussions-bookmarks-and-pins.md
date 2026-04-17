# Phase 03 — Category discussions, bookmarks, and pins

Status: not started
Commit checkpoint:
Notes:
- 

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Convert the discussions experience from global to category-scoped, while moving bookmarks to their own global route.

This phase should deliver:
- category discussions under `/c/:teamId/discussions`
- feed tabs limited to recent/unread/participating
- global bookmarks page
- category-vs-space pin behavior

---

## Files

### Create
- `frontend/src/pages/Bookmarks.vue`

### Edit
- `frontend/src/pages/Discussions.vue`
- `frontend/src/components/DiscussionList.vue`
- `frontend/src/components/DiscussionView.vue`
- `frontend/src/components/DiscussionRow.vue`
- `frontend/src/components/DiscussionBreadcrumbs.vue`
- `frontend/src/data/discussions.ts` if minor type/help text changes are needed

---

## Tasks

### 1. Repurpose Discussions page as category discussions
In `frontend/src/pages/Discussions.vue`:
- read `teamId`
- pass `team: teamId` into filters
- keep only tabs:
  - recent
  - unread
  - participating
- remove `following` and `bookmarks` tabs
  - note: `following` (shows discussions in spaces user is a member of) is removed because category scoping already limits to relevant spaces; `participating` (discussions the user authored or commented on) is the preferred engagement filter
- update Add new to route to scoped `NewDiscussion` with `teamId`
- update cache keys to include `teamId`
- change `routeName` from `ProjectDiscussion` to `Discussion` with `teamId` + `spaceId` params

Backend note: the `following` feed_type handler in `gameplan/gameplan/doctype/gp_discussion/api.py` **must be kept** for backward compatibility and potential future use — only the frontend tab is removed.

### 2. Add Bookmarks page
Create `frontend/src/pages/Bookmarks.vue`:
- global page
- uses `DiscussionList` with `feed_type: 'bookmarks'`
- `showPinned=false`
- add page header + breadcrumb

### 3. Update pin behavior in DiscussionList
In `frontend/src/components/DiscussionList.vue`:
- if list is scoped to a space -> pinned list should use `pin_scope: 'Space'`
- if list is category discussions -> pinned list should use `pin_scope: 'Category'`
- remove assumptions about a global discussion feed
- update `pinnedDiscussions` cache key to include `teamId` when scoped by category

### 4. Update pin UI copy in DiscussionView
In `frontend/src/components/DiscussionView.vue`:
- replace “Pin Globally” language with “Pin to Category”
- replace submitted scope `Global` with `Category`
- keep `Space` pin behavior unchanged

### 5. Update route params on discussion row / breadcrumbs
In:
- `frontend/src/components/DiscussionRow.vue`
- `frontend/src/components/DiscussionBreadcrumbs.vue`

Ensure:
- routes into discussions include `teamId`
- breadcrumb root is category discussions, not old Team/Project routes

---

## Guardrails

- Bookmarks must remain global.
- Do not accidentally category-filter the `/bookmarks` page.
- Do not change search/task/page behavior in this phase.

---

## Verify before commit

- `/c/:teamId/discussions` loads discussions only for that category
- supported feed tabs are only recent/unread/participating
- `/bookmarks` works and stays global
- category discussions show only category pins
- space discussions show only space pins
- discussion links and breadcrumbs include correct `teamId`

---

## Suggested commit checkpoint

`feat(category-scope): scope discussions by category and split out bookmarks`
