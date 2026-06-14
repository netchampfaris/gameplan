# Phase 05 — Scoped route audit and space navigation

Status: not started
Commit checkpoint:
Notes:
- 

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Audit and fix all routes that now require `communityId`, especially links from global surfaces into scoped community routes.

This phase should make route usage internally consistent across the app.

---

## Files

### Edit
- `frontend/src/pages/Space.vue`
- `frontend/src/pages/SpaceDiscussions.vue`
- `frontend/src/components/SpaceBreadcrumbs.vue`
- `frontend/src/pages/Spaces/Spaces.vue`
- `frontend/src/pages/Spaces/SpaceCard.vue`
- `frontend/src/pages/Spaces/PinnedSpaceCard.vue`
- `frontend/src/pages/Search.vue`
- `frontend/src/pages/Notifications.vue`
- `frontend/src/components/TaskList.vue`
- `frontend/src/pages/PageGrid.vue`
- `frontend/src/pages/Page.vue`
- `frontend/src/pages/Task.vue`
- `frontend/src/components/Activity.vue`
- `frontend/src/components/MergeSpaceDialog.vue`
- `frontend/src/components/CommandPalette/CommandPalette.vue`
- any additional files found by route audit grep

---

## Tasks

### 1. Make Space page canonical and self-healing
In `frontend/src/pages/Space.vue`:
- accept `communityId`
- if route `communityId` does not match `space.team`, redirect to canonical scoped route
- timing note: the space data may not be loaded when the component mounts. Two valid approaches:
  - **Option A (preferred)**: use `spaces.data` from the global spaces list (already loaded at app boot) to resolve `space.team` synchronously and redirect in a `watch` or `beforeRouteEnter` guard
  - **Option B**: accept a brief render, then redirect once `useSpace()` resolves the mismatch
- keep existing visit tracking behavior

### 2. Update current-community space navigation
In:
- `frontend/src/pages/SpaceDiscussions.vue`
- `frontend/src/components/SpaceBreadcrumbs.vue`
- `frontend/src/pages/Spaces/SpaceCard.vue`
- `frontend/src/pages/Spaces/PinnedSpaceCard.vue`

Ensure all space routes include `communityId`.

Important breadcrumb rule:
- breadcrumb root should point to community discussions, not global `/spaces`

### 3. Update global surfaces to link into scoped routes correctly
In:
- `frontend/src/pages/Search.vue`
- `frontend/src/pages/Notifications.vue`
- `frontend/src/components/TaskList.vue`
- `frontend/src/pages/PageGrid.vue`
- `frontend/src/pages/Page.vue`
- `frontend/src/pages/Task.vue`
- `frontend/src/components/Activity.vue`
- `frontend/src/components/CommandPalette/CommandPalette.vue`

Ensure all links into discussion/space/task/page routes include `communityId`.

### 4. Keep `/spaces` global
In `frontend/src/pages/Spaces/Spaces.vue`:
- do not re-scope the page
- only update links so opening a space uses canonical scoped route

### 5. Run route audit grep and fix leftovers
Use:
```bash
rg -n "name: 'Discussion'|name: 'Space'|name: 'SpaceTask'|name: 'SpacePage'|name: 'NewDiscussion'|name: 'Discussions'|name: 'DiscussionsTab'" frontend/src
```

Review every match and ensure `communityId` is included where needed.

---

## Guardrails

- Global surfaces must remain global in content.
- Do not introduce community filtering to Search/Tasks/Pages/People/Notifications.
- `/spaces` remains a global housekeeping page.

---

## Cypress coverage (required)

Add a simple spec (`cypress/e2e/community-scoped-links.cy.ts`) asserting links from global surfaces resolve into canonical scoped routes:
- opening a space from `/spaces` lands on `/community/:communityId/space/:spaceId`
- opening a discussion from search or bookmarks lands on a URL containing `/community/<id>/`
- a space breadcrumb's root points at community discussions, not `/spaces`

See `./AGENT_RUNBOOK.md` for run commands and conventions.

---

## Verify before commit

- opening a space from anywhere lands on canonical scoped route
- opening a discussion from search/notifications/bookmarks lands on canonical scoped route
- task/page links from global surfaces include correct community
- breadcrumb paths are correct
- no obvious route-param runtime errors remain

---

## Suggested commit checkpoint

`refactor(community): normalize scoped route params across global and space flows`
