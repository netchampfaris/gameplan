# Phase 01 — Current category and routing

Status: completed
Commit checkpoint: pending
Notes:
- Refactored category state into `frontend/src/data/activeCategory.ts` using a session-style semantic module.
- Tightened canonical routes to strict `/c/:teamId/...` paths and added explicit `NotFound` handling.
- Replaced generic redirect helpers with smaller inline redirects and route-specific checks.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Create the new routing foundation for category scope.

This phase should establish:
- current-category resolution
- canonical `/c/:teamId/...` route structure
- `/bookmarks`
- compatibility redirects from `/`, `/home`, and `/discussions`

Do **not** change sidebar UX or discussion page behavior deeply yet beyond what is required to make the new route tree valid.

---

## Files

### Create
- `frontend/src/data/activeCategory.ts`
- `frontend/src/pages/NotFound.vue`

### Edit
- `frontend/src/router.js`
- `frontend/src/data/spaces.ts`
- `frontend/src/data/teams.ts` if small helper exports are needed
- route call sites touched as needed to keep strict scoped routes working

---

## Tasks

### 1. Add current-category helpers
In `frontend/src/data/activeCategory.ts` implement:
- persisted last selected category id
- helper to get first accessible active category from `teams.data`
- helper to get resolved default category id
- helper to persist selected category
- helper to generate category home route
- helper to switch category by routing to category discussions
- `useCurrentCategory()` derived from route params when present

Key rules:
- route param `teamId` is source of truth on scoped routes
- for global routes, current category comes from persisted / fallback resolution
- ignore archived or inaccessible categories
- when all categories are archived (no active categories):
  - admin (`Gameplan Admin` role) -> resolve to `/spaces`
  - non-admin -> resolve to an empty state page/route
  - do not show onboarding (onboarding is only for sites with zero data)

### 2. Replace primary category-scoped routes with scoped paths
In `frontend/src/router.js`:
- keep existing route names where possible
- move canonical category-scoped paths under `/c/:teamId/...`
- make `/c/:teamId` redirect to `/c/:teamId/discussions`
- add `/c/:teamId/discussions/:feedType?`
- add scoped space paths
- add scoped `NewDiscussion`
- add scoped `new-space` route
- add `LegacyNewDiscussion` route at `/new-discussion` for legacy drafts without project/category

### 3. Add global bookmarks route
Add:
- `Bookmarks` route at `/bookmarks`

The page component can be added in Phase 03, but the route path/name should be reserved now.

### 4. Add compatibility redirects
Implement redirects for:
- `/`
- `/home`
- `/discussions`
- `/discussions/:feedType`
- `/space/:spaceId/...` (old space URLs without category prefix)

Behavior:
- `/` and `/home` -> resolved default category or onboarding
- `/discussions` -> current selected category discussions or first accessible category
- unsupported old feed types should fall back to `recent`
- `/new-discussion` is handled by `LegacyNewDiscussion` (not a redirect)
- `/space/:spaceId` -> resolve `teamId` from space data and redirect to `/c/:teamId/space/:spaceId`
- `/space/:spaceId/discussion/:postId/:slug?` -> resolve `teamId` and redirect to canonical scoped route

Important: old `/space/:spaceId/...` URLs are widely bookmarked and shared. They must continue working as redirects.

### 5. Keep old team/project URLs as compatibility redirects
Do not delete old team/project route handling yet.
Instead:
- redirect old project/team URLs to canonical scoped routes
- when redirecting, include correct `teamId`

### 5b. Handle inaccessible or invalid `teamId` in routes
In `activeCategory.ts` or as a router guard:
- if `teamId` in the URL is invalid, archived, or inaccessible -> redirect to first accessible category
- if no accessible categories exist at all (all archived or none created):
  - admin (`Gameplan Admin` role) -> redirect to `/spaces` so they can manage/unarchive
  - non-admin -> show a helpful empty state (e.g., "No categories available. Ask an admin to set things up.")
  - do **not** redirect to onboarding in this case — onboarding is only for brand-new sites with no data
- persist the corrected category after redirect

### 5c. Auto-switch category on deep links
When navigating to a route with a different `teamId` than the current persisted category:
- update the persisted category to match the route
- this ensures shared links and notification clicks set the correct category context
- implement this in a `router.afterEach` guard or within `activeCategory.ts` as a route watcher

### 6. Update onboarding redirect behavior in router
If the app exits onboarding due to existing data, do not send users to old global discussions.
Send them to resolved category discussions.

---

## Guardrails

- Do not remove old route names if that creates broad churn.
- Do not delete old Team/Project files in this phase.
- Do not introduce preferred-home behavior anywhere.
- Do not yet refactor global pages like Tasks/Search/Pages.

---

## Verify before commit

- `/` resolves correctly
- `/home` resolves correctly
- `/c/:teamId` redirects correctly
- `/discussions` redirects correctly
- old project/team URLs still land somewhere valid
- old `/space/:spaceId/...` URLs redirect to canonical scoped routes
- navigating to an invalid `teamId` redirects gracefully
- navigating to a different category's route updates persisted category
- app boot does not crash due to route-name mismatches

---

## Suggested commit checkpoint

`feat(category-scope): add current category state and scoped route tree`
