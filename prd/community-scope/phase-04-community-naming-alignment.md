# Phase 04 — Community naming alignment

Status: done
Commit checkpoint: 6f32346a — refactor(community): align active frontend naming with community model
Notes:
- Inserted after Phases 01–03 to align the already-built active frontend code with the new Community branding before more feature work lands.
- Implemented (divergences/discoveries recorded below; the plan was largely accurate):
  - Renamed files exactly as planned: `activeCategory.ts`→`communityState.ts`, `teams.ts`→`communities.ts`, `categorySpaces.ts`→`communitySpaces.ts`, `categorySpacesSheet.ts`→`communitySpacesSheet.ts`, `CategorySwitcherCombobox.vue`→`CommunitySwitcherCombobox.vue`, `MobileCategorySpacesSheet.vue`→`MobileCommunitySpacesSheet.vue`, `NoCategories.vue`→`NoCommunities.vue`. Deleted `CategoryDropdown.vue` (zero imports, non-legacy active-shell file).
  - `communityState` shape: the old module exposed `.team` (the team doc). Renamed to `communityState.doc` per CODE_STYLE's preferred shape (`communityState.id` / `.doc` / `.change()`). Updated all `activeCategory.team` reads to `communityState.doc`.
  - `communities.ts` exported-symbol renames: `teams`→`communities`, `activeTeams`→`activeCommunities`, `getTeam`→`getCommunity`, `getActiveTeam`→`getActiveCommunity`. Also renamed the file's tightly-coupled siblings for internal consistency: `availableTeams`→`availableCommunities`, `joinedTeams`→`joinedCommunities`, `useTeam`→`useCommunity`, `isTeamJoined`→`isCommunityJoined`, and the local `Team` interface→`Community`. Kept `doctype: 'GP Team'` and the `GPTeam` generated type. Also renamed the frontend `cacheKey` `'Teams'`→`'Communities'` (app-layer cache key, not a schema name).
  - **Deep-link persistence fix (the one behavior change the phase authorizes):** the prior `router.afterEach` hook called `activeCategory.change(teamId)` on *every* community-scoped navigation, so notification/shared deep links silently overwrote the persisted home community. Removed that hook entirely. Persistence now happens only on deliberate switches (rail icon, switcher combobox, mobile sheet, ManageCommunities). This matches DECISIONS ("Deep links … do not silently overwrite the persisted current community").
  - Route meta `categoryScope` renamed to `communityScope` (router.ts, `router-meta.d.ts`, `DesktopLayout.vue` `onCategoryRoute`→`onCommunityRoute`, `MobileLayout.vue` `onCategoryRoute`→`onCommunityRoute`). Router helper `ensureCategoryDataLoaded`→`ensureCommunityDataLoaded`.
  - localStorage key is `gameplan:communityId` with **no** migration from `gameplan:activeCategory`.
  - Canonical route param `teamId`→`communityId` for all canonical routes (`Discussions`, `DiscussionsTab`, `Space`+children, `Discussion`, `NewDiscussion`, `NewSpace`) and the `/space/:spaceId/...` and `/community/:communityId` redirects. Legacy `/:teamId` Team/Project routes keep their `:teamId` path param; their redirects now emit `communityId`. Schema reads that *supply* the value (`space.team`, `project.team`, `item.team`, `getSpace(...)?.team`) are preserved.
  - Schema-boundary comparisons kept intact: `space.team === communityState.id` (communitySpaces.ts) and `space.team !== communityId` (router guard).
  - Legacy/admin `/spaces` files `ChangeSpaceCategoryDialog.vue` and `EditCategoryDialog.vue` were intentionally **not** renamed (out of the active-community path); only their `@/data/teams` import binding was updated to `@/data/communities`. The unused `AddTeamDialog.vue` (zero imports, not a `Category*` file) was kept but its import updated to keep the build green. `Spaces/Spaces.vue` keeps its `route.query.teamId` admin-page query convention (read-only, no writers, not a canonical route param).
- Cypress: added `frontend/cypress/e2e/community-naming.cy.ts` (3 specs, all green) covering canonical landing URL, rail switch + persistence across reload, and deep-link not changing persisted home. The rail switcher uses a custom `#trigger` slot, so the spec opens it via the `aria-label="More communities"` icon button (the built-in `aria-haspopup="listbox"` is absent in custom-trigger mode, so `selectCombobox` can't open it). Seeding must `update_joined_teams` the created communities: a freshly inserted `GP Team` does not auto-add the creator as a member, and `getActiveCommunity` (router guard + `communityState`) only sees joined communities.
- Pre-existing (NOT introduced by Phase 04) test failures, verified by diffing against HEAD's router/Onboarding which had byte-identical logic (only the param name differed): `onboarding.cy.js` and the space-detail specs (`discussion.cy.js`, `page.cy.js`, `task.cy.js`, `project.cy.js`, draft publish in `new-discussion.cy.ts`). Root causes are outside this phase: (a) the onboarding backend (`gameplan.api.onboarding`) creates a `GP Project` with no `team`, so `router.replace` to `Space` gets an undefined community id ("Missing required param") — fixed by Phase 08's community-required onboarding; (b) those specs visit `/g/space/<space>` for a community the test user never joined, and the membership-gated scoped-route guard (present at HEAD too) 404s them. These should be revisited when Phase 08 lands the onboarding/membership backend.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Rename active frontend app-layer concepts from Category/Team language to Community language without touching backend schema/API names.

This phase should deliver:
- active frontend state/data modules using Community naming
- canonical route params using `communityId`
- active shell/components using Community naming
- no app-layer compatibility shims for old names
- stale unused `Category*` files deleted when safe
- focused automated coverage for the route/persistence behavior most likely to regress

---

## Naming Boundary

Rename active frontend app code:
- `activeCategory` → `communityState`
- `activeCategory.ts` → `communityState.ts`
- `teams.ts` → `communities.ts`
- `teams` resource → `communities`
- `activeTeams` → `activeCommunities`
- `getTeam` → `getCommunity`
- `getActiveTeam` → `getActiveCommunity`
- `categorySpaces.ts` → `communitySpaces.ts`
- `categorySpacesSheet.ts` → `communitySpacesSheet.ts`
- `CategorySwitcherCombobox.vue` → `CommunitySwitcherCombobox.vue`
- `MobileCategorySpacesSheet.vue` → `MobileCommunitySpacesSheet.vue`
- `NoCategories.vue` → `NoCommunities.vue`
- canonical route param `teamId` → `communityId`

Keep backend/schema names:
- `GP Team`
- `GPTeam` generated type name
- document fields named `team`
- backend Python variables/functions tied directly to `GP Team`
- `pin_scope: 'Category'`

Do not add compatibility shims:
- no `activeCategory` re-export from `communityState`
- no alias file that preserves the old frontend module path
- no localStorage fallback from old app-state keys

Legacy route/page files are not active Community code. Do not rename old Team/Project route pages just for consistency.

---

## Files

### Rename / Create
- `frontend/src/data/activeCategory.ts` → `frontend/src/data/communityState.ts`
- `frontend/src/data/teams.ts` → `frontend/src/data/communities.ts`
- `frontend/src/data/categorySpaces.ts` → `frontend/src/data/communitySpaces.ts`
- `frontend/src/data/categorySpacesSheet.ts` → `frontend/src/data/communitySpacesSheet.ts`
- `frontend/src/components/CategorySwitcherCombobox.vue` → `frontend/src/components/CommunitySwitcherCombobox.vue`
- `frontend/src/components/MobileCategorySpacesSheet.vue` → `frontend/src/components/MobileCommunitySpacesSheet.vue`
- `frontend/src/pages/NoCategories.vue` → `frontend/src/pages/NoCommunities.vue`

### Delete if unused
- `frontend/src/components/CategoryDropdown.vue` — delete if it still has zero imports.
- any stale non-legacy `Category*` active-shell file with zero imports.

### Edit
- `frontend/src/router.ts`
- `frontend/src/components/AppRail.vue`
- `frontend/src/components/AppSidebar.vue`
- `frontend/src/components/MobileLayout.vue`
- `frontend/src/pages/Discussions.vue`
- `frontend/src/pages/Drafts.vue`
- `frontend/src/pages/Home.vue`
- `frontend/src/pages/HomeOverview.vue`
- `frontend/src/pages/NewDiscussion/*`
- `frontend/src/components/CommandPalette/CommandPalette.vue`
- `frontend/src/components/ManageCommunitiesDialog.vue`
- active imports/call sites found by grep
- focused frontend tests for canonical route params and selected-community persistence

---

## Tasks

### 1. Rename selected community state

Implement `frontend/src/data/communityState.ts` with:
- `communityState.id` — persisted/default community id
- `communityState.doc` — document for `communityState.id`
- `communityState.change(communityId)` — deliberate switch only

Rules:
- localStorage key should be clean app-language, e.g. `gameplan:communityId`
- no migration from `gameplan:activeCategory`
- do not update persisted state from route deep links
- scoped pages read the displayed community from `route.params.communityId`

### 2. Rename frontend community resource module

Rename `teams.ts` to `communities.ts` in active frontend imports.

Use Community names at the module boundary:
- `communities`
- `activeCommunities`
- `getCommunity`
- `getActiveCommunity`

Keep the backing doctype as `GP Team` and generated type as `GPTeam`.

### 3. Rename canonical route params

In `frontend/src/router.ts` and active route call sites:
- canonical paths use `/community/:communityId/...`
- active component props use `communityId`
- route objects use `params: { communityId }`
- legacy route redirects may still receive old `teamId`, but redirect into canonical routes with `communityId`

Do not rename legacy Team/Project pages or route names.

### 4. Rename active community UI/data files

Rename active shell/community code to Community language:
- switcher components
- mobile community spaces sheet
- current-community spaces module
- no-communities page
- loop variables and local variables in active components

General rule: if a file is on the active app/community code path, use Community naming. If it is dead or legacy compatibility code, do not modernize it.

### 5. Keep schema boundary explicit

It is acceptable for active code to compare app names to schema fields:
```ts
space.team === communityId
```

Do not add one-off wrappers just to hide `team`. Add product-named helpers only if they clarify repeated schema-boundary logic.

### 6. Add focused automated tests

Add a small number of tests for the brittle behavior introduced by this phase. Suggested coverage:
- canonical route objects/paths use `communityId`
- legacy redirects map old `teamId` to canonical `communityId`
- opening a scoped deep link does not persist selected/default community
- deliberate switch action persists selected/default community

Use the smallest test surface that fits the current frontend test setup. Comprehensive coverage is not required, but zero tests for the branch is not acceptable.

---

## Guardrails

- Do not rename backend schema, DocTypes, or database fields.
- Do not rename generated `GPTeam` types.
- Do not rename old Team/Project legacy route pages.
- Do not add backward compatibility aliases for old frontend module names.
- Do not accidentally community-filter global pages.
- Do not change product behavior except the deliberate deep-link persistence fix if current code still persists from router hooks.

---

## Cypress coverage (required)

Add a simple, high-order spec (`cypress/e2e/community-naming.cy.ts`) proving the rename didn't break routing. Mirror existing specs (`cy.login()`, `cy.scope('sidebar')`, `cy.combobox(...)`). Assert:
- visiting `/g` lands on a `/community/:communityId/discussions` URL
- the rail community switcher opens, switching navigates to the other community's discussions, and the choice persists across reload
- following a deep link to another community does **not** change the persisted home community

See `./AGENT_RUNBOOK.md` for run commands and conventions.

---

## Verify before commit

- Grep active frontend code for stale `activeCategory`, `categorySpaces`, and active `Category*` imports.
- Canonical routes resolve with `communityId`.
- Legacy `/space/:spaceId/...` redirects still resolve.
- Legacy Team/Project redirects still target canonical routes.
- Deep links render the route community without changing persisted selected/default community.
- Community switcher updates persisted selected/default community and navigates to that community's discussions.
- Global pages remain global.
- Focused automated tests pass.

---

## Suggested commit checkpoint

`refactor(community): align active frontend naming with community model`
