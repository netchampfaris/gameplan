# Phase 06 — Scoped composer and drafts

Status: not started
Commit checkpoint:
Notes:
- 

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
