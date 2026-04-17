# Phase 08 — Cleanup, regression pass, and PR finish

Status: not started
Commit checkpoint:
Notes:
- 

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
- old Team / Project pages if they are truly unused after redirect migration
- any stale imports created during previous phases
- PRD files in this directory to mark statuses and commit checkpoints

---

## Tasks

### 1. Remove obsolete preferred-home behavior
Delete or fully orphan after verifying no imports remain:
- `usePreferredHomePage.ts`
- `HomePageSettingsDialog.vue`
- old sidebar preference logic

### 2. Remove dead active route dependencies
If old Team / Project pages are only legacy redirects now:
- verify router no longer depends on their components
- delete dead files only if safe
- otherwise leave them but note them as deprecated in PR description

### 3. Regression pass on primary flows
Verify:
- app entry routes
- category switcher
- current-category sidebar
- category discussions
- global bookmarks
- scoped composer
- legacy draft behavior
- global pages linking into scoped routes
- `/spaces` admin and non-admin behavior
- onboarding

### 4. Update PRD status markers
In each phase file and `PLAN.md`:
- mark completed phases
- fill in commit checkpoint hashes/messages
- add brief notes for any intentional follow-up work left out of this branch

### 5. Prepare the single PR description
The PR description should summarize:
- routing changes
- shell/sidebar changes
- global vs scoped surface split
- draft compatibility behavior
- `/spaces` behavior
- migrations
- testing performed

---

## Guardrails

- Do not add extra scope in cleanup.
- Do not slip category filtering into global pages.
- Do not remove legacy draft support.

---

## Verify before final commit

### Core behavior
- no global discussions feed remains
- `/` and `/home` resolve correctly
- category switcher always visible
- sidebar only shows current-category spaces

### Global surfaces
- `/bookmarks` is global
- `/search`, `/tasks`, `/pages`, `/people`, `/notifications`, `/drafts`, `/spaces` remain global in content

### Scoped flows
- discussions are category-scoped
- new discussion is scoped
- new space is scoped
- deep links auto-establish the correct category context

### Compatibility
- legacy unscoped drafts still open
- old route redirects still work

### Data
- uncategorized spaces migrate to `Default`
- `Global` pin scope migrates to `Category`

---

## Suggested final commits

Examples:
- `refactor(category-scope): remove preferred home remnants and dead route dependencies`
- `chore(category-scope): finalize regression fixes and update implementation docs`
