# Phase 06 — Scoped composer and drafts

Status: done
Commit checkpoint: `e8108958` — feat(community): scope composer and preserve legacy draft routing
Notes:
- Much of the routing groundwork already existed at HEAD (Phases 04–05): `useNewDiscussion.ts` already created drafts and published under scoped vs legacy routes, `Discussions.vue` already had the scoped "+ New" ("Add new") button pointing at `{ name: 'NewDiscussion', params: { communityId } }`, and `SpaceDiscussions.vue`'s "Add new" already passed `communityId` + `spaceId`. Phase 06 work was the remaining deltas, not a rewrite.
- Task 1 deltas in `useNewDiscussion.ts`: (a) added `communityId`/`isScoped` computed from `route.params.communityId`; (b) `canAutoSave` now refuses to create a brand-new draft until a space is selected (`!draftDoc.value && !draftData.value.project` blocks the first save) — existing drafts keep auto-saving even if their space is later cleared; (c) `formattedSpaceOptions`/`spaceOptions` filter to `space.team === communityId` in scoped mode (full grouped list on the legacy route); (d) publish + `_createDraft` now resolve the target community from the computed `communityId` (falling back to `getSpace(project)?.team` on the legacy route) instead of re-reading `currentRoute.params`; (e) added `normalizeDraftRoute`: a draft opened on the legacy route that already has a resolvable community is `router.replace`d onto the canonical scoped route (the `draftId` query is stable, so the localStorage key is preserved across the swap). Verified live: `/g/new-discussion?draft=<scoped>` redirects to `/g/community/<id>/new-discussion?draft=<scoped>`.
- Task 2: no edits needed to `DiscussionHeader.vue` (breadcrumb already branched scoped vs legacy) or `DiscussionMetadata.vue` (it consumes the now-scoped `formattedSpaceOptions` from context). Confirmed live the picker shows only the route community's spaces.
- Task 3 `Drafts.vue`: removed the "Add new" button (Drafts is now a pure list). Replaced the hardcoded `LegacyNewDiscussion` row link with `draftRoute(draft)`: scoped `NewDiscussion` when `getSpace(draft.project)?.team` resolves, else legacy `/new-discussion?draft=...`. Dropped now-unused `communityState`/`useRouter`/`computed` imports.
- Task 4 (command palette): left as-is per the phase. The existing "Add Discussion" entry already routes to scoped `NewDiscussion` (or `LegacyNewDiscussion` when no community), so it did not actively break — no stub needed.
- **Execution reality (build-mode frappe-ui skew):** the demo site is built by `yarn --cwd frontend build`, but `node_modules/frappe-ui` was a leftover **symlink to the local `../../frappe-ui` checkout** (from a prior `dev:frappe-ui` session — see MEMORY "frappe-ui local dev symlink"). `build` does NOT run `unlink-frappe-ui.mjs` (only `dev` does), so the production bundle was compiled against the local checkout, introducing a reka-ui TooltipProvider/`TooltipRoot` context skew that threw `Injection Symbol(TooltipRootContext) not found` and silently dropped the Discussions "Add new" button (rendered as `<!--v-if-->`). Fix: run `node frontend/scripts/unlink-frappe-ui.mjs` to restore the published `frappe-ui@1.0.0-beta.6`, then rebuild. The button then renders correctly. Verifiers/implementers must build against the **published** frappe-ui, not the symlinked checkout.
- Cypress: new `cypress/e2e/community-composer.cy.ts` (3 it()s) green headless after the frappe-ui restore. The `DiscussionMetadata` "Select Space" combobox can sit under the sticky editor toolbar (`elementFromPoint` at its center returns a toolbar icon), so the spec opens the trigger with `{ force: true }` then clicks the option rather than `cy.selectCombobox`. Phase 04 (`community-naming.cy.ts`) + Phase 05 (`community-scoped-links.cy.ts`) remain green (6/6) — no regression.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Make new discussion creation community-scoped while preserving legacy unscoped drafts that do not yet have a selected space/community.

This phase should deliver:
- scoped canonical new discussion route
- community-scoped space picker
- new drafts only after space selection
- conditional draft routing between scoped and legacy modes

---

## Files

### Edit
- `frontend/src/pages/NewDiscussion/useNewDiscussion.ts`
- `frontend/src/pages/NewDiscussion/NewDiscussion.vue`
- `frontend/src/pages/NewDiscussion/DiscussionHeader.vue`
- `frontend/src/pages/NewDiscussion/DiscussionMetadata.vue`
- `frontend/src/pages/Drafts.vue`
- `frontend/src/components/CommandPalette/CommandPalette.vue`

---

## Tasks

### 1. Update composer state logic
In `frontend/src/pages/NewDiscussion/useNewDiscussion.ts`:
- treat `/community/:communityId/new-discussion` as canonical route
- derive current community from route params in scoped mode
- restrict space options to current community in scoped mode
- do not auto-create a brand-new draft until a space is selected
- when a draft already has a project, normalize/open it under scoped route
- when a draft has no project/community, allow legacy `/new-discussion?draft=...`
- when publishing, route to `Discussion` with `communityId` and `spaceId`

### 2. Update composer wrapper and metadata
In:
- `frontend/src/pages/NewDiscussion/NewDiscussion.vue`
- `frontend/src/pages/NewDiscussion/DiscussionHeader.vue`
- `frontend/src/pages/NewDiscussion/DiscussionMetadata.vue`

Implement:
- breadcrumb behavior for scoped vs legacy draft route
- metadata space picker uses scoped community spaces when in canonical mode

### 3. Update Drafts page routing logic
In `frontend/src/pages/Drafts.vue`:
- **Remove the "Add new" button** from this page. Drafts is now a pure list view; new-discussion creation lives only inside community discussions list (per `./DECISIONS.md`).
- draft rows should route:
  - to scoped composer when draft has project/team
  - to legacy `/new-discussion?draft=...` when project is missing
- keep Drafts page global

### 4. Command palette — deferred
The command palette "Add Discussion" entry point is **out of scope** for this branch. Leave existing palette code as-is (or stub it to navigate to community discussions if it actively breaks). Track for a follow-up.

---

## Guardrails

- Legacy drafts with no selected space must continue working.
- Do not make Drafts page community-scoped.
- Do not auto-create drafts before a space is selected for new content.

---

## Cypress coverage (required)

Add a spec (`cypress/e2e/community-composer.cy.ts`):
- the only "+ New discussion" entry point is inside the community discussions list, and it opens the scoped composer (`/community/:communityId/new-discussion`)
- publishing a discussion lands on the scoped `Discussion` route
- the Drafts page shows **no** "+ New" button
- a legacy draft without a project still opens via `/new-discussion?draft=...`

See `./AGENT_RUNBOOK.md` for run commands and conventions.

---

## Verify before commit

- Drafts page shows no "+ New" button; new-discussion creation lives only in the community discussions list
- selecting no space does not create a new draft automatically
- draft with project opens in scoped composer
- legacy draft without project opens in legacy route
- publishing lands on scoped discussion route

---

## Suggested commit checkpoint

`feat(community): scope composer and preserve legacy draft routing`
