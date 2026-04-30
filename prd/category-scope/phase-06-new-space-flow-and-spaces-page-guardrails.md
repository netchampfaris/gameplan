# Phase 06 — New space flow and `/spaces` page guardrails

Status: not started
Commit checkpoint:
Notes:
- 

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

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
From current-category shell entry points (per the design in `./DECISIONS.md` "Shell information architecture"):
- the `+` revealed on hover/focus next to the "Spaces" header in the category sidebar (admin only)
- the "Create a space" CTA in the category sidebar's empty state (admin only)
- the mobile Home tab's "+ New space" affordance (admin only)

In all three cases:
- open the locked-category new-space flow with `lockedCategoryId: activeCategory.id`
- do not offer category selection there

### 4. Keep `/spaces` page global and intact
In `frontend/src/pages/Spaces/Spaces.vue`:
- keep the page global
- keep current management interactions
- only update any route links as needed for scoped navigation

### 5. Restrict `/spaces` to admins only
In `frontend/src/router.js` (route guard) and `frontend/src/pages/Spaces/Spaces.vue`:
- detect admin via `user.roles.includes('Gameplan Admin')` from `useSessionUser()` in `frontend/src/data/users.ts`
- non-admins navigating to `/spaces` should be redirected away (e.g. to current category discussions). The `/spaces` rail icon is also hidden for non-admins (handled in Phase 02).
- admin users keep current management actions (create, move, merge, archive, etc.) unchanged

No read-only mode is required because non-admins never reach the page.

---

## Guardrails

- Do not change move-space implementation.
- Do not remove or expand `/spaces` admin actions.
- Do not convert `/spaces` into a scoped category page.

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
