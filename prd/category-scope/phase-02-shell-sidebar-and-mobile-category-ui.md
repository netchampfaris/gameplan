# Phase 02 — Shell, sidebar, and mobile category UI

Status: not started
Commit checkpoint:
Notes:
- 

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Make category context visible everywhere in the app shell.

This phase should deliver:
- persistent category switcher
- desktop sidebar scoped to current-category spaces
- mobile category affordance
- removal of active preferred-home UI from the shell

---

## Files

### Create
- `frontend/src/components/CategorySwitcher.vue`
- `frontend/src/data/categorySpaces.ts`
- `frontend/src/components/MobileCategoryBar.vue` (recommended)
- `frontend/src/components/MobileCategorySpacesSheet.vue` (recommended)

### Edit
- `frontend/src/components/AppSidebar.vue`
- `frontend/src/components/MobileLayout.vue`
- `frontend/src/components/DesktopLayout.vue` if minor integration changes are needed
- `frontend/src/components/HomePageSettingsDialog.vue` only to stop active usage, not necessarily delete
- `frontend/src/composables/usePreferredHomePage.ts` only if imports must be removed now

---

## Tasks

### 1. Add reusable CategorySwitcher
Implement a category switcher that:
- lists accessible active categories
- shows current selected category
- routes to `/c/:teamId/discussions` on switch
- persists the new category before navigation
- **hide the switcher entirely when there is only one active category** — the user has no meaningful choice to make, so don’t show the control

### 2. Add scoped space helpers
In `frontend/src/data/categorySpaces.ts` implement:
- current-category space list helpers
- current-category space option helpers
- use `spaces.data` as the backing source

Do not change global grouped-space helpers in this phase.

### 3. Rewrite desktop sidebar
In `frontend/src/components/AppSidebar.vue`:
- replace preferred-home row with `CategorySwitcher`
- remove active preferred-home settings affordance from the sidebar
- add global `Bookmarks` nav item
- make Discussions nav item route to current-category discussions
- keep global nav items global
- show only spaces from current category
- remove all-team grouping behavior from the sidebar
- for the joined/all space filter: keep it if practical, scoped to current category. The current `joinedSpaces` API returns a flat list of space IDs — filter this against `categorySpaces` to get the intersection. If this is too complex, remove the filter for now and add it back later.

Keep `/spaces` in top navigation as the global housekeeping page.

### 4. Add mobile category affordance
In `frontend/src/components/MobileLayout.vue`:
- keep global bottom tabs global (Search, Notifications, etc.)
- update the "Home" or "Discussions" bottom tab to route to current-category discussions (`/c/:teamId/discussions`)
- add a visible category switcher affordance
- add a way to browse current-category spaces without using `/spaces`

Before implementing, inspect `MobileLayout.vue` to identify the current bottom tab structure and which tab corresponds to discussions/home.

Recommended:
- a top bar with category switcher
- a sheet/menu listing current-category spaces

### 5. Stop using preferred-home logic in active shell code
Remove active dependency on:
- `usePreferredHomePage()` in sidebar logic
- `HomePageSettingsDialog` from current shell flow

Do not delete dead files yet if that increases risk.

---

## Guardrails

- `/spaces` must remain a global page.
- Search/Tasks/Pages/People/Notifications remain global in content.
- Mobile must still offer quick access to current-category spaces even though `/spaces` stays global.

---

## Verify before commit

- category switcher visible in desktop shell when multiple categories exist
- category switcher **hidden** when only one category exists
- category switcher visible in mobile shell when multiple categories exist
- switching category always lands on category discussions
- desktop sidebar shows only current-category spaces
- global nav links still work
- `/spaces` still opens as global page

---

## Suggested commit checkpoint

`feat(category-scope): add category switcher and scoped shell navigation`
