# Phase 08 — Onboarding, backend changes, and migrations

Status: not started
Commit checkpoint:
Notes:
- 

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Finalize backend and data-layer changes required by the new information architecture.

This phase should deliver:
- onboarding creates community + first space
- every newly created community auto-creates a `General` space (server-side hook, not just onboarding)
- uncategorized spaces migrate into `Default`
- pin scope migrates from `Global` to `Category`
- backend defaults match the new model

## ⚠️ Migration ordering note

The `team` backfill migration (task 3 below) is **critical for community discussions to work correctly**. `GP Discussion.team` is a denormalized copy of `project.team` with no `fetch_from` today, so discussions created before this feature can have null/empty `team` fields and will not appear in any community feed. §5a adds `fetch_from: "project.team"` to keep new/edited rows in sync going forward; the task 3 backfill is the one-time fix for existing rows.

**If deploying incrementally**: run the migration patch before enabling the scoped discussions UI. In a single-PR workflow, ensure the migration is registered in `patches.txt` so it runs on `bench migrate` before users access the new routes.

**For development/testing**: run `bench --site <site> migrate` after adding the patches but before testing community discussions. If testing community discussions before Phase 08 is implemented, manually backfill `team` on `GP Discussion` or community discussions will return empty results.

---

## Files

### Create
- `gameplan/gameplan/doctype/gp_project/patches/assign_default_team_to_uncategorized_spaces.py`
- `gameplan/gameplan/doctype/gp_discussion/patches/rename_global_pin_scope_to_category.py`

### Edit
- `gameplan/api.py`
- `gameplan/www/g.py`
- `gameplan/gameplan/doctype/gp_discussion/gp_discussion.py`
- `gameplan/gameplan/doctype/gp_discussion/gp_discussion.json`
- `gameplan/gameplan/doctype/gp_team/gp_team.py` — `after_insert` hook to auto-create `General` space
- `gameplan/patches.txt`
- `frontend/src/pages/Onboarding.vue`
- `frontend/src/types/doctypes.ts` or generated type pipeline output

---

## Tasks

### 1. Update onboarding backend API
In `gameplan/api.py`:
- update `onboarding()` to create:
  1. `GP Team` (the `after_insert` hook in §1a will auto-create `General` inside it)
  2. `GP Project` (user-named first space) linked to that team — created in addition to `General`
- return team id and the user-named space id to the frontend
- a freshly onboarded site therefore lands with a community containing **two** spaces: `General` (public, hook-created) and the user-named space (whatever privacy the user chose)

### 1a. Auto-create `General` space on `GP Team` insert
In `gameplan/gameplan/doctype/gp_team/gp_team.py`:
- add an `after_insert` hook that creates a `GP Project` titled `General` linked to the new team
- `General` must be **public** (`is_private = 0`) so all community members have access by default; do not insert per-member ACL rows for `General`
- **idempotency rule**: skip auto-create if **any** `GP Project` already exists in this team (broader than checking by title — protects the migration path where `Default` may inherit pre-existing orphaned spaces)
- this guarantees every community has at least one valid landing destination — eliminates the empty-community edge case from the routing layer
- this rule is documented in `./DECISIONS.md` under "Auto-create `General` space"

### 2. Update onboarding frontend page
In `frontend/src/pages/Onboarding.vue`:
- collect community name + first space name
- keep email invite behavior
- reload spaces and teams on success
- persist selected community
- route to community discussions

### 3. Add migration for uncategorized spaces (existing-site only)
Create patch:
- `gameplan/gameplan/doctype/gp_project/patches/assign_default_team_to_uncategorized_spaces.py`

Implement:
- detect `GP Project` rows with empty/null `team`
- if any such rows exist: create `Default` `GP Team` (idempotently — `frappe.db.exists` first), then assign those orphans to `Default`
- if there are no orphaned spaces: do nothing (do **not** create `Default` on otherwise-categorized sites)
- backfill denormalized `team` fields on all project-linked doctypes

**Doctypes to backfill — all confirmed to have a `team` field via grep on their `.json`:**
- `GP Discussion`
- `GP Task`
- `GP Page`
- `GP Draft` (fetch_from: project.team)
- `GP Notification`
- `GP Project Visit`
- `GP Pinned Project`
- `GP Guest Access`
- `GP Followed Project`

The patch can issue a single `UPDATE ... SET team = (SELECT team FROM tabGP Project WHERE name = <doc>.project)` per table — no need for runtime schema introspection. Each `UPDATE` should also have a `WHERE team IS NULL OR team = ''` clause to keep it idempotent.

Run these denormalized `team` backfills **unconditionally** — independent of the orphaned-spaces branch above. A site can have every space correctly categorized yet still have `GP Discussion` (and other project-linked) rows with null `team`, because `fetch_from` is new and never re-saved old rows. If it makes the trigger conditions clearer, split this into its own patch separate from `assign_default_team_to_uncategorized_spaces`.

Suppress the `after_insert` hook when creating `Default` (e.g. `default_team.flags.ignore_after_insert = True` or the equivalent project-creation suppression), so the migration doesn't create a `General` inside `Default` before the orphaned spaces are reassigned. After reassignment, `Default` already contains projects, so the idempotency rule in §1a would skip `General` anyway — but suppressing during creation is the safer belt-and-suspenders.

### 4. Add migration for pin scope rename
Create patch:
- `gameplan/gameplan/doctype/gp_discussion/patches/rename_global_pin_scope_to_category.py`

Implement:
- rename `Global` to `Category`

### 5. Update doctype schema / defaults
In `gp_discussion.py` and `gp_discussion.json`:
- default pin scope should be `Category`
- select options should be `Category\nSpace`

### 5a. Auto-populate `GP Discussion.team` via fetch_from
In `gameplan/gameplan/doctype/gp_discussion/gp_discussion.json`:
- add `"fetch_from": "project.team"` to the `team` field so it auto-populates from the linked space on insert/save. Today the field has no `fetch_from` and `team` is only set in `move_discussion`, which is why legacy rows can be null.
- this fixes new and edited rows going forward; existing rows are handled by the task 3 backfill.
- the manual `discussion.team = ...` assignment in `move_discussion` (`gp_discussion.py`) becomes redundant once `fetch_from` is in place — safe to leave or remove.

### 6. Register patches
In `gameplan/patches.txt`:
- add both new patches

### 7. Sanity-check boot route logic
In `gameplan/www/g.py`:
- if **0 `GP Project` AND 0 `GP Team`** -> return `/onboarding` (brand-new site)
- otherwise return `/home`
- a site with projects-but-no-teams is handled by the migration in §3 (creates `Default`), not by onboarding
- a site with teams-but-no-projects is handled by the `after_insert` hook (auto-creates `General`), not by onboarding
- do not move last-selected-community logic to the server

### 8. Update frontend pin_scope types
- The **DocType select options** become `Category\nSpace` (task 5), so any *generated* type narrows to `'Category' | 'Space'`.
- Keep the **hand-maintained union** in `frontend/src/types/doctypes.ts` and `frontend/src/data/discussions.ts` as `'Global' | 'Category' | 'Space'` for now — the transitional `=== 'Global'` read path (Phase 03) still needs it. Phase 09 removes that read path and narrows the union to `'Category' | 'Space'`.

---

## Guardrails

- Do not move community-resolution persistence to the backend.
- Do not rewrite search or unrelated APIs in this phase.
- Migration patches must be idempotent and safe for existing sites.

---

## Cypress + backend coverage (required)

- **Cypress:** extend `cypress/e2e/onboarding.cy.js` so onboarding creates a community + first space, lands on that community's discussions, and the auto-created `General` space is present.
- **Backend** (`bench --site gameplan.frappe.test run-tests --app gameplan`): migration tests mirroring `gameplan/gameplan/doctype/gp_discussion/test_gp_discussion.py`, covering: idempotency on re-run, no `Default` created on a fully-categorized site, no duplicate `General` inside `Default`, `fetch_from` populates `team` on new rows, and null-`team` discussions become visible in a community feed after backfill.

See `./AGENT_RUNBOOK.md` for run commands and conventions.

---

## Verify before commit

- onboarding creates community + space successfully
- onboarding lands in community discussions
- creating a new `GP Team` outside of onboarding (e.g. via admin flow) automatically creates a `General` space inside it
- the `after_insert` hook is idempotent (does not duplicate `General` for the migration `Default` team)
- uncategorized spaces are assigned to `Default`
- denormalized `team` fields are backfilled on **all** project-linked doctypes (run unconditionally, even when no orphaned spaces exist)
- new discussions auto-populate `team` from `project.team` via `fetch_from`
- guests who can access a space still see its discussions after the backfill (guest filtering not broken)
- a public `General` space is visible to all community members without per-member ACL rows
- discussion pin scope now uses `Category`
- old `Global` records are migrated
- patches are registered
- focused migration tests cover, at minimum: (a) idempotency on re-run, (b) no `Default` created on a fully-categorized site, (c) `General` not duplicated inside `Default`, (d) discussions with null `team` become visible in the community feed after migration

---

## Suggested commit checkpoint

`feat(community): add onboarding and migration support for community scope`
