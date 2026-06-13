# Phase 01 — Current community and routing

Status: completed
Commit checkpoint: pending
Notes:
- Refactored community state into `frontend/src/data/activeCategory.ts` using a session-style semantic module.
- Tightened canonical routes to strict `/community/:teamId/...` paths and added explicit `NotFound` handling.
- Replaced generic redirect helpers with smaller inline redirects and route-specific checks.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Create the new routing foundation for community scope.

This phase should establish:
- current-community resolution
- canonical `/community/:teamId/...` route structure
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

### 1. Add current-community helpers
In `frontend/src/data/activeCategory.ts` implement:
- persisted last selected community id
- helper to get first accessible active community from `teams.data`
- helper to get resolved default community id
- helper to persist selected community
- helper to generate community home route
- helper to switch community by routing to community discussions
- `useCurrentCategory()` derived from route params when present

Key rules:
- route param `teamId` is source of truth on scoped routes
- for global routes, current community comes from persisted / fallback resolution
- ignore archived or inaccessible communities
- when all communities are archived (no active communities):
  - admin (`Gameplan Admin` role) -> resolve to `/spaces`
  - non-admin -> resolve to an empty state page/route
  - do not show onboarding (onboarding is only for sites with zero data)

### 2. Replace primary community-scoped routes with scoped paths
In `frontend/src/router.js`:
- keep existing route names where possible
- move canonical community-scoped paths under `/community/:teamId/...`
- make `/community/:teamId` redirect to `/community/:teamId/discussions`
- add `/community/:teamId/discussions` (recent), `/community/:teamId/discussions/unread`, `/community/:teamId/discussions/participating` as distinct routes (no tab strip — the sidebar drives the active feed)
- any other `/discussions/:feedType` value 404s
- add scoped space paths
- add scoped `NewDiscussion`
- add scoped `new-space` route
- add `LegacyNewDiscussion` route at `/new-discussion` for legacy drafts without project/community

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
- `/space/:spaceId/...` (old space URLs without community prefix)

Behavior:
- `/` and `/home` -> resolved default community or onboarding
- `/discussions` -> current selected community discussions or first accessible community
- unsupported old feed types should fall back to `recent`
- `/new-discussion` is handled by `LegacyNewDiscussion` (not a redirect)
- `/space/:spaceId` -> resolve `teamId` from space data and redirect to `/community/:teamId/space/:spaceId`
- `/space/:spaceId/discussion/:postId/:slug?` -> resolve `teamId` and redirect to canonical scoped route

Important: old `/space/:spaceId/...` URLs are widely bookmarked and shared. They must continue working as redirects.

### 5. Keep old team/project URLs as compatibility redirects
Do not delete old team/project route handling yet.
Instead:
- redirect old project/team URLs to canonical scoped routes
- when redirecting, include correct `teamId`

### 5b. Handle inaccessible or invalid `teamId` in routes
In `activeCategory.ts` or as a router guard:
- if `teamId` in the URL is invalid, archived, or inaccessible -> redirect to first accessible community
- if no accessible communities exist at all (all archived or none created):
  - admin (`Gameplan Admin` role) -> redirect to `/spaces` so they can manage/unarchive
  - non-admin -> render an inline empty state inside the shell on `/` ("No communities available. Ask an admin to set things up."). Not a dedicated route or page component.
  - do **not** redirect to onboarding in this case — onboarding is only for brand-new sites with no data
- persist the corrected community after redirect

### 5c. Persistence rule (deliberate switches only)
**Do not** auto-update persisted community from `router.afterEach`. Persistence updates only when the user takes a deliberate switch action:
- clicking a community in the rail switcher combobox
- clicking the community-name dropdown trigger that switches community
- explicit calls to `activeCategory.change(teamId)`

Following a deep link to another community navigates the route but leaves the persisted "home" community unchanged. This avoids notification-click side-effects rewriting the user's default landing.

### 6. Update onboarding redirect behavior in router
If the app exits onboarding due to existing data, do not send users to old global discussions.
Send them to resolved community discussions.

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
- `/community/:teamId` redirects correctly
- `/discussions` redirects correctly
- old project/team URLs still land somewhere valid
- old `/space/:spaceId/...` URLs redirect to canonical scoped routes
- navigating to an invalid `teamId` redirects gracefully
- navigating to a different community's route leaves persisted community unchanged unless the switch was deliberate
- app boot does not crash due to route-name mismatches

---

## Suggested commit checkpoint

`feat(community): add current community state and scoped route tree`
