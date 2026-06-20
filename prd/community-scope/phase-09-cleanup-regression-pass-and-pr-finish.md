# Phase 09 — Cleanup, regression pass, and PR finish

Status: done
Commit checkpoint: `6a1ec7d3` — refactor(community): finalize regression fixes and cleanup
Notes:
- **Phase 08 was already committed** (`8b0546b6`) before this phase started, with all its doc Notes filled in; only PRD docs were dirty in the working tree at Phase 09 start. The pre-existing red specs (`onboarding.cy.js`, space-detail) are green per Phase 08's Notes.
- **`PersonalHome.vue` was still wired as the `getHomeRoute()` fallback** (data exists but user has joined no community). Per DECISIONS "All-archived fallback", replaced that fallback with: admin (`Gameplan Admin`) → `Spaces`, non-admin → `NoCommunities`. Then deleted `PersonalHome.vue`, its `/personal` route, and the `ManageCommunitiesDialog.vue` reference (now points at the same admin/`NoCommunities` resolution via `getHomeRoute`-style logic inlined there). `getActiveCommunity`/`communityState.id` is null exactly when the user has joined zero active communities.
- **`Home.vue` and `HomeOverview.vue` were already orphaned** (zero imports; the `Home`/`/home` route is a `RouteGuard` that redirects via `getHomeRoute()`). `HomeOverview.vue` rendered a global discussions list (`DiscussionList` with no project filter) — exactly the "global discussions feed" the PRD forbids. Deleted both. `usePreferredHomePage.ts` + `HomePageSettingsDialog.vue` were only referenced by each other (the dialog had no remaining mount site) — deleted both.
- **`Category*` files stay.** `ChangeSpaceCategoryDialog.vue` and `EditCategoryDialog.vue` are still imported (by `SpaceOptions.vue` and `Spaces/SpaceCardGroup.vue` respectively) and serve the `/spaces` admin/move-space flows — not stale, not deleted (matches CODE_STYLE: delete only zero-import non-legacy `Category*`).
- **Legacy Team/Project page files left in place** per Task 2 (redirect compatibility).
- **Pin read path:** removed the `pin_scope === 'Global'` branch in `DiscussionView.vue`, dropped `'Global'` from the `pin_scope: ['in', ['Category', 'Global']]` filter in `DiscussionList.vue` (now just `'Category'`), and narrowed the union to `'Category' | 'Space'` in `doctypes.ts` and `discussions.ts`. Phase 08's migration flipped all `'Global'` rows to `'Category'`, so no legacy rows remain.
- **Cypress catch-up specs:** added `community-smoke.cy.ts` (required end-state smoke) and `community-shell.cy.ts` (the runbook's deferred phase 01-03 catch-up: rail switcher, scoped discussions URL, global bookmarks).

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Finish the branch in a clean, reviewable state.

This phase should remove obsolete active references, verify regressions, and prepare the single PR for review.

---

## Files

### Likely edit / delete targets
- `frontend/src/composables/usePreferredHomePage.ts`
- `frontend/src/components/HomePageSettingsDialog.vue`
- `frontend/src/pages/Home.vue`
- `frontend/src/pages/PersonalHome.vue` — superseded by rail Home → community discussions (see `./DECISIONS.md` "Shell information architecture")
- stale unused `Category*` components — delete if they are not legacy compatibility code and have zero imports.
- old Team / Project pages if they are truly unused after redirect migration
- any stale imports created during previous phases
- PRD files in this directory to mark statuses and commit checkpoints

---

## Tasks

### 1. Remove obsolete preferred-home behavior
Delete or fully orphan after verifying no imports remain:
- `usePreferredHomePage.ts`
- `HomePageSettingsDialog.vue`
- `PersonalHome.vue`
- old sidebar preference logic

### 1a. Decommission superseded shell components
- Verify stale `Category*` components have zero call sites. Delete if they are not legacy compatibility code.
- Verify any old single-column-sidebar variants are unreferenced. Delete if so.

### 1b. Remove the legacy `'Global'` pin read path
- Delete the `=== 'Global'` pin read branch in `frontend/src/components/DiscussionView.vue` and `frontend/src/components/DiscussionList.vue` — after the Phase 08 migration, no `'Global'` rows remain.
- Narrow the `pin_scope` union in `frontend/src/types/doctypes.ts` and `frontend/src/data/discussions.ts` from `'Global' | 'Category' | 'Space'` to `'Category' | 'Space'`.

### 2. Old Team / Project pages — leave in place
Per the agreed plan, **do not delete** old Team / Project page files in this branch even if they are unreferenced. They stay as redirect compatibility for the first release window. A follow-up PR removes them once route stability is confirmed in production.

### 3. Regression pass on primary flows
Verify:
- app entry routes
- community switcher (combobox) opens from rail-top icon; static badge when single community
- composite header (rail icon + sidebar community name) reads as one row
- community sidebar slides out smoothly on global routes and back in on community routes
- rail destination active states only highlight the exact current destination
- community discussions
- global bookmarks
- scoped composer
- legacy draft behavior
- global pages linking into scoped routes
- `/spaces` admin and non-admin behavior
- onboarding
- mobile bottom tabs (Home, Inbox, Search, More) with persistent tab bar on drill-down
- mobile Home tab shows community context; other tabs do not
- empty-spaces state renders only in the rare case (`General` auto-create should make this unreachable in normal flows)
- focused automated tests added during this branch still pass

### 4. Update PRD status markers
In each phase file and `PLAN.md`:
- mark completed phases
- fill in commit checkpoint hashes/messages
- add brief notes for any intentional follow-up work left out of this branch

### 5. Prepare the single PR description
The PR description should summarize:
- routing changes
- shell/sidebar changes (including feed-type rows in sidebar, no tab strip)
- global vs scoped surface split
- draft compatibility behavior
- `/spaces` behavior (admin-only)
- migrations
- testing performed

**Explicitly call out follow-ups deferred from this branch:**
- Comprehensive automated tests beyond the focused coverage added in this branch
- Rollback / reverse-migration patches
- Deletion of legacy Team / Project page files

---

## Guardrails

- Do not add extra scope in cleanup.
- Do not slip community filtering into global pages.
- Do not remove legacy draft support.

---

## Cypress coverage (required)

This is the regression phase. Run the **full** suite (`cd frontend && yarn test`) and add a short smoke spec (`cypress/e2e/community-smoke.cy.ts`) asserting the end state:
- no global discussions feed; `/` and `/home` resolve to community discussions (or the no-communities empty state)
- the community sidebar is visible on `/community/:communityId/*` and hidden on global routes
- `/bookmarks` is global

All specs added in phases 04–08 must pass. See `./AGENT_RUNBOOK.md`.

---

## Verify before final commit

### Core behavior
- no global discussions feed remains
- `/` and `/home` resolve correctly
- community switcher (combobox) accessible from rail-top icon when multiple communities exist
- community sidebar visible only on `/community/:communityId/*` routes; hidden on global routes with width transition
- sidebar only shows current-community spaces

### Global surfaces
- `/bookmarks` is global
- `/search`, `/tasks`, `/pages`, `/people`, `/notifications`, `/drafts`, `/spaces` remain global in content

### Scoped flows
- discussions are community-scoped
- new discussion is scoped
- new space is scoped
- deep links auto-establish the correct community context

### Compatibility
- legacy unscoped drafts still open
- old route redirects still work

### Data
- uncategorized spaces migrate to `Default`
- `Global` pin scope migrates to `Category`
- no `=== 'Global'` pin read branch remains in the frontend; `pin_scope` union is `'Category' | 'Space'`

---

## Suggested final commits

Examples:
- `refactor(community): remove preferred home remnants and dead route dependencies`
- `chore(community): finalize regression fixes and update implementation docs`

---

## PR description (draft)

> Prepared, not opened. Per the runbook, Phase 09 only drafts the PR; do not open it without human approval.

**Title:** `feat(community): scope collaboration to communities`

### Summary
Gameplan's top-level entity is now a **Community** (UI name for the `GP Team` doctype; schema/`team`/`pin_scope: 'Category'` identifiers are unchanged). The app shell always has a current community, there is no global discussions feed, and canonical collaboration URLs carry the community explicitly as `communityId`.

### Routing
- Canonical scoped routes: `/community/:communityId/discussions`, `/community/:communityId/discussions/:feedType`, `/community/:communityId/space/:spaceId`, `/community/:communityId/new-discussion`.
- `/`, `/home`, `/community`, `/discussions` resolve to the last visited/first accessible community's discussions; brand-new sites go to onboarding; a logged-in user with data but no joined community lands on `/manage` (admin) or the `NoCommunities` empty state (non-admin).
- Valid community-scoped deep links become the current community.
- Invalid/inaccessible scoped URLs 404 instead of silently rerouting. Legacy `/space/...` and team/project URLs redirect into canonical scoped routes.
- Feed types reduced to `recent` / `unread` / `participating`; `following` dropped from the frontend allow-list (backend handler retained).

### Shell / sidebar
- Three-column desktop shell: narrow rail (Gameplan/Home, community shortcuts, overflow switcher,
  global destinations), community sidebar (`w-56`), content area.
- Feed types are sidebar rows ("All Discussions", "Participating", "Unread") — no tab strip on the discussions page.
- Community switching happens through direct community shortcuts and the "More communities" overflow combobox.
- Community sidebar renders only on `/community/:communityId/*` routes; global routes expand the content area.
- Mobile: Home / Inbox / Search / More bottom tabs; Home is community-first and drills into community feeds/spaces.

### Global vs scoped split
- Global (cross-community) in v1: `/manage`, `/search`, `/bookmarks`, `/notifications`, `/drafts`, `/tasks`, `/pages`, `/people`, command palette. These were intentionally **not** community-filtered, though create actions use route/current community defaults.
- Scoped: community discussions, sidebar spaces list, space routes, new discussion, new space, onboarding.

### Drafts
- Canonical create route is community-scoped; `/drafts` is a pure list.
- Command palette "Add Discussion" is supported and resolves community/space from the current route
  or current community before opening the scoped composer.
- Legacy unscoped drafts still open via `/new-discussion?draft=...`.

### Management
- Admin-only global management page for communities, spaces, members, guests, and community images. Canonical product URL is `/manage`; `/spaces` is only compatibility. Non-admins are redirected away by a route guard and the rail entry point is hidden for them. Existing admin actions unchanged.

### Migrations (Phase 08)
- Every new `GP Team` auto-creates a public `General` space via `after_insert` (idempotent: skipped if the team already has any space).
- Existing sites with uncategorized spaces (empty `team`) get a `Default` community and those orphans reassigned. Fresh/categorized sites do **not** get `Default`.
- Denormalized `team` backfilled across all 9 project-linked doctypes (load-bearing: empty `team` hides a discussion from every community feed). `GP Discussion.team` now auto-populates via `fetch_from: "project.team"`.
- `pin_scope` `Global` → `Category` migration; default/options updated to `Category` / `Category\nSpace`. Phase 09 removed the transitional `=== 'Global'` read path and narrowed the frontend union to `'Category' | 'Space'`.
- Patches registered in `patches.txt`; `bench migrate` is idempotent (second run is a no-op).

### Testing performed
- `yarn --cwd frontend build` succeeds.
- Cypress full suite green (25 tests / 13 specs), including the previously-red onboarding + space-detail specs fixed in Phase 08, plus new Phase 09 specs `community-smoke.cy.ts` and the catch-up `community-shell.cy.ts`.
- Backend migration assertions validated against the disposable test site (see Phase 08 notes re: the bench-wide server-script test-runner preload blocker).

### Deferred to follow-ups (out of scope for this branch)
- Comprehensive automated tests beyond the focused coverage added here.
- Rollback / reverse-migration patches.
- Deletion of legacy Team / Project page files (kept this release as redirect compatibility).
