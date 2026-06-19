# Gameplan

Async-first discussions tool for remote teams. Frappe (Python) backend + Vue 3 / TypeScript SPA frontend.

## Architecture

- **Dual app**: Frappe app serving a Vue SPA at the `/g` route via `gameplan/www/g.py` (boot data) and `gameplan/api.py` (whitelisted endpoints). Real-time via Socket.IO.
- **Backend**: DocTypes in `gameplan/gameplan/doctype/`. MariaDB. Full-text search via SQLite FTS5 (`gameplan.search_sqlite.GameplanSearch`, wired in `hooks.py`).
- **Frontend**: `frontend/src/` — `components/` (shared), `pages/`, `data/` (fetching composables), `utils/`. Vue Router under `/g/`. No state libraries (use `ref`/`computed`).
- **frappe-ui**: local copy in `./frappe-ui/` (git submodule). TS types auto-generated from the doctype list in `frontend/vite.config.ts`.

## Product language vs. schema

UI/product language is **Community** and **Space**; the schema still uses old names. Use Community/Space in app/UI code; the doctype names stay as-is until a migration is planned.

- `GP Project` = **Space** (holds discussions, tasks, pages)
- `GP Team` = **Community** (groups spaces; "Category" in older UI)
- Other core doctypes: `GP Discussion`, `GP Comment`, `GP Page`, `GP Task`, `GP User Profile`

## Commands

Local dev site is `gameplan.frappe.test` (CI uses `gameplan.test`).

- `yarn dev` — Vite frontend on :8080 (unlinks local frappe-ui, uses published package)
- `yarn dev:frappe-ui` — same, but symlinks `node_modules/frappe-ui` → `./frappe-ui/` for library work
- `yarn build` / `bench start` (from `frappe-bench/`) — build frontend / run backend
- Backend tests: `bench --site gameplan.frappe.test run-tests --app gameplan` (or `--module <path>`, `--test <method>`).
- E2E: `cd frontend && yarn test` (Cypress, specs in `frontend/cypress/e2e/`)
- frappe-ui units: `cd frappe-ui && yarn test` (Vitest)
- Lint: `pre-commit run --all-files` (ruff for Python — tabs, double quotes, line 110; Prettier for frontend)

## Frontend conventions

- `<script setup lang="ts">` + Composition API. Small component → single file; large → folder with `index.ts`.
- Prefer `useTemplateRef` over `ref`/`querySelector` for DOM access.
- **Data fetching**: only frappe-ui's `useList` / `useDoc` / `useCall` — never `useFetch`. Examples in `frontend/src/data/`.
- **Styling / design / Tailwind**: follow `./frappe-ui/skills/frappe-ui/SKILL.md` (components + semantic design tokens). Gameplan rule: **gray shades only — never color shades, even for primary states.**
- @vueuse/core is available — prefer it over custom implementations.

## Backend conventions

- Prefer `frappe.qb.get_query()` over `frappe.db.get_all()` (pass `ignore_permissions=False` when checks are needed).
- Permissions: `has_permission` hooks in `hooks.py` (e.g. `GP Page`); community/space membership gates access.
- Debugging: add `def execute():` to a file like `gameplan/debug.py`, run via `bench --site gameplan.frappe.test execute gameplan.debug.execute`.

## Code comments

Explain *why*, not *what*. JSDoc/TSDoc for complex functions/composables. No comments for self-explanatory code.
