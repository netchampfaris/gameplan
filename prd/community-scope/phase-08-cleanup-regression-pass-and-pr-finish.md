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
- `frontend/src/pages/PersonalHome.vue` — superseded by rail Home → community discussions (see `./DECISIONS.md` "Shell information architecture")
- `frontend/src/components/CategorySwitcher.vue` — role moved to `CategorySwitcherCombobox` triggered by the rail-top icon. Delete once no call sites remain.
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
- Verify `CategorySwitcher.vue` has zero call sites (its role moved to `CategorySwitcherCombobox` invoked from the rail). Delete if so.
- Verify any old single-column-sidebar variants are unreferenced. Delete if so.

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
- Command palette "Add discussion" entry point
- Automated tests (router resolution, migration idempotency)
- Rollback / reverse-migration patches
- Deletion of legacy Team / Project page files

---

## Guardrails

- Do not add extra scope in cleanup.
- Do not slip community filtering into global pages.
- Do not remove legacy draft support.

---

## Verify before final commit

### Core behavior
- no global discussions feed remains
- `/` and `/home` resolve correctly
- community switcher (combobox) accessible from rail-top icon when multiple communities exist
- community sidebar visible only on `/community/:teamId/*` routes; hidden on global routes with width transition
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

---

## Suggested final commits

Examples:
- `refactor(community): remove preferred home remnants and dead route dependencies`
- `chore(community): finalize regression fixes and update implementation docs`
