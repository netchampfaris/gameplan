# Phase 06 — New space flow and `/spaces` page guardrails

Status: not started
Commit checkpoint:
Notes:
- 

---

## Goal

Add a canonical scoped new-space flow without breaking the existing global `/spaces` management page.

This phase should deliver:
- scoped new-space creation that always uses current category
- preserved global `/spaces` management flow
- non-admin read-only behavior for `/spaces`

---

## Files

### Edit
- `frontend/src/components/NewSpaceDialog.vue`
- `frontend/src/pages/Spaces/Spaces.vue`
- `frontend/src/components/AppSidebar.vue`
- `frontend/src/router.js`
- optional new wrapper page `frontend/src/pages/NewSpace.vue`

---

## Tasks

### 1. Add locked category mode to NewSpaceDialog
In `frontend/src/components/NewSpaceDialog.vue`:
- add prop like `lockedCategoryId?: string`
- when locked:
  - hide category picker
  - force `newSpace.doc.team`
- when unlocked:
  - keep current behavior for global `/spaces` flows

### 2. Add canonical scoped new-space route
In `frontend/src/router.js`:
- add `/c/:teamId/new-space`
- route may render a small wrapper page or a full page component

If needed, create:
- `frontend/src/pages/NewSpace.vue`

### 3. Use locked mode from scoped shell
From current-category shell entry points such as sidebar add-space:
- open the locked-category new-space flow
- do not offer category selection there

### 4. Keep `/spaces` page global and intact
In `frontend/src/pages/Spaces/Spaces.vue`:
- keep the page global
- keep current management interactions
- only update any route links as needed for scoped navigation

### 5. Add read-only behavior for non-admins on `/spaces`
In `frontend/src/pages/Spaces/Spaces.vue`:
- detect admin vs non-admin using the `Gameplan Admin` role from the session user’s data (available via `useSessionUser()` from `frontend/src/data/users.ts` — check `user.role === 'Gameplan Admin'`)
- admin users keep current management actions (create, move, merge, archive, etc.)
- non-admin users (`Gameplan Member`, `Gameplan Guest`) should see a read-only view:
  - can browse spaces grouped by category
  - can click into a space to navigate
  - cannot see create/move/merge/archive controls

Do not redesign the page.
Only gate behavior and preserve current capabilities.

---

## Guardrails

- Do not change move-space implementation.
- Do not remove or expand `/spaces` admin actions.
- Do not convert `/spaces` into a scoped collaboration page.

---

## Verify before commit

- scoped new-space flow always creates in current category
- category picker is hidden in scoped mode
- category picker still exists in unlocked/global management mode
- `/spaces` remains global
- non-admin `/spaces` is read-only
- admin `/spaces` still has current management actions

---

## Suggested commit checkpoint

`feat(category-scope): add scoped new space flow and guardrails for spaces page`
