# Phase 07 — Onboarding, backend changes, and migrations

Status: not started
Commit checkpoint:
Notes:
- 

---

## Goal

Finalize backend and data-layer changes required by the new information architecture.

This phase should deliver:
- onboarding creates category + first space
- uncategorized spaces migrate into `Default`
- pin scope migrates from `Global` to `Category`
- backend defaults match the new model

## ⚠️ Migration ordering note

The `team` backfill migration (task 3 below) is **critical for category discussions to work correctly**. Without it, discussions created before this feature will have null/empty `team` fields and will not appear in any category feed.

**If deploying incrementally**: run the migration patch before enabling the scoped discussions UI. In a single-PR workflow, ensure the migration is registered in `patches.txt` so it runs on `bench migrate` before users access the new routes.

**For development/testing**: run `bench --site <site> migrate` after adding the patches but before testing Phase 03 (category discussions). If testing Phase 03 before Phase 07 is implemented, manually backfill `team` on `GP Discussion` or category discussions will return empty results.

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
- `gameplan/patches.txt`
- `frontend/src/pages/Onboarding.vue`
- `frontend/src/types/doctypes.ts` or generated type pipeline output

---

## Tasks

### 1. Update onboarding backend API
In `gameplan/api.py`:
- update `onboarding()` to create:
  1. `GP Team`
  2. `GP Project` linked to that team
- return both ids to the frontend

### 2. Update onboarding frontend page
In `frontend/src/pages/Onboarding.vue`:
- collect category name + first space name
- keep email invite behavior
- reload spaces and teams on success
- persist selected category
- route to category discussions

### 3. Add migration for uncategorized spaces
Create patch:
- `gameplan/gameplan/doctype/gp_project/patches/assign_default_team_to_uncategorized_spaces.py`

Implement:
- detect spaces without category
- create `Default` category if needed
- assign all uncategorized spaces to `Default`
- backfill denormalized `team` fields on project-linked doctypes

Doctypes to backfill (verified to have `team` field):
- `GP Discussion` — has `team` field
- `GP Task` — verify field exists before backfilling
- `GP Page` — verify field exists before backfilling
- `GP Draft` — has `team` field (fetch_from: project.team)
- `GP Notification` — verify field exists before backfilling
- `GP Project Visit` — verify field exists before backfilling
- `GP Pinned Project` — verify field exists before backfilling
- `GP Guest Access` — verify field exists before backfilling
- `GP Followed Project` — verify field exists before backfilling

Note: for each doctype, the patch should first check if the `team` field exists in the schema before attempting to update. Some doctypes may not have a `team` field.

### 4. Add migration for pin scope rename
Create patch:
- `gameplan/gameplan/doctype/gp_discussion/patches/rename_global_pin_scope_to_category.py`

Implement:
- rename `Global` to `Category`

### 5. Update doctype schema / defaults
In `gp_discussion.py` and `gp_discussion.json`:
- default pin scope should be `Category`
- select options should be `Category\nSpace`

### 6. Register patches
In `gameplan/patches.txt`:
- add both new patches

### 7. Sanity-check boot route logic
In `gameplan/www/g.py`:
- if no `GP Project` exists -> return `/onboarding` (keep current behavior)
- if `GP Project` exists but no `GP Team` exists -> also return `/onboarding` (new category+space creation needed)
- otherwise return `/home`
- do not move last-selected-category logic to the server

Note: the check should be: if no projects OR no teams → onboarding. A site with categories but no spaces, or spaces but no categories, both need the onboarding flow.

### 8. Update generated frontend types
Ensure frontend type definitions reflect:
- `pin_scope: 'Category' | 'Space'`

---

## Guardrails

- Do not move category-resolution persistence to the backend.
- Do not rewrite search or unrelated APIs in this phase.
- Migration patches must be idempotent and safe for existing sites.

---

## Verify before commit

- onboarding creates category + space successfully
- onboarding lands in category discussions
- uncategorized spaces are assigned to `Default`
- denormalized `team` fields are backfilled
- discussion pin scope now uses `Category`
- old `Global` records are migrated
- patches are registered

---

## Suggested commit checkpoint

`feat(category-scope): add onboarding and migration support for category-scoped collaboration`
