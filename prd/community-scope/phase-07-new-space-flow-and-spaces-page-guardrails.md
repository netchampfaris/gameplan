# Phase 07 — New space flow and `/spaces` page guardrails

Status: done
Commit checkpoint: `9afb2f07` — feat(community): add scoped new space flow and guardrails for spaces page
Notes:
- `NewSpaceDialog.vue` already existed and used a `category` prop (Phase 04 had not renamed its internals). Renamed the prop to `lockedCommunityId` and its internal helpers (`selectedCategory`→`selectedCommunity`, `categoryOptions`→`communityOptions`, `selectCategory`→`selectCommunity`) to match Community naming. The prop's behavior is unchanged: when set, it hides the community picker and forces `newSpace.doc.team`. Updated both callers (`AppSidebar.vue`, `Spaces/Spaces.vue` — the latter's `categoryForNewSpace`→`lockedCommunityForNewSpace` and the `@new-space` handler arg `categoryName`→`communityName`).
- The `/community/:communityId/new-space` route already existed but pointed at the `ComingSoon.vue` placeholder. Replaced it with a real wrapper page `frontend/src/pages/NewSpace.vue` (added `props: true`) that opens `NewSpaceDialog` in locked mode for the route `communityId` and navigates back to that community's discussions on close. `ComingSoon.vue` is now unreferenced but left in place (it is not a `Category*` file and not in scope to delete).
- Admin gate for `/spaces`: added a `beforeEnter` guard on the `Spaces` route in `router.ts`. The project uses a singular `UserInfo.role` field, not a `roles` array, so the actual admin check is `useSessionUser().role !== 'Gameplan Admin'` (the phase text said `user.roles.includes('Gameplan Admin')`; the existing codebase convention is `sessionUser.role === 'Gameplan Admin'`, used in AppRail/AppSidebar/MobileMoreMenu). Non-admins are redirected via `getHomeRoute()`. The rail `/spaces` icon was already admin-gated in Phase 02 (`AppRail.vue` `adminShortcuts`).
- Mobile "+ New space" affordance lives in `MobileCommunitySpacesSheet.vue` (the Home-tab bottom sheet is where the mobile spaces list renders). Added an admin-only "New space" row that closes the sheet and opens the locked `NewSpaceDialog` for `communityState.id`.
- frappe-ui `Button` hardcodes `aria-label: props.label` and spreads `$attrs` BEFORE it, so a plain `aria-label="..."` attribute on a `<Button icon=...>` is overridden by the (empty) `label` and never reaches the DOM. The AppSidebar `+` button therefore had no usable `aria-label` (a latent Phase 02 issue). Fixed by passing `label="New space"` instead of `aria-label="New space"`; since `icon` is set, frappe-ui renders the icon (not the label text) but still emits `aria-label="New space"`. Required for `cy.iconButton('New space')`.
- Cypress non-admin login: `clear_data` creates `john@example.com` (Gameplan Member) with no password. The spec sets one via `frappe.client.set_value` on the `new_password` field (Frappe hashes it on save) as Administrator, then `cy.login('john@example.com', ...)`. Verified working against the demo site.
- Spec `community-spaces-guardrails.cy.ts`: 2/2 green. Regression-checked `community-naming`, `community-scoped-links`, `community-composer` — all still green (the scoped-links "opens a space from /spaces" case confirms admins are not blocked by the new guard). Build (`yarn --cwd frontend build`) passes.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Add a canonical scoped new-space flow without breaking the existing global `/spaces` management page.

This phase should deliver:
- scoped new-space creation that always uses current community
- preserved global `/spaces` management flow
- non-admin read-only behavior for `/spaces`

---

## Files

### Edit
- `frontend/src/components/NewSpaceDialog.vue`
- `frontend/src/pages/Spaces/Spaces.vue`
- `frontend/src/components/AppSidebar.vue`
- `frontend/src/router.ts`
- optional new wrapper page `frontend/src/pages/NewSpace.vue`

---

## Tasks

### 1. Add locked community mode to NewSpaceDialog
In `frontend/src/components/NewSpaceDialog.vue`:
- add prop like `lockedCommunityId?: string`
- when locked:
  - hide community picker
  - force `newSpace.doc.team`
- when unlocked:
  - keep current behavior for global `/spaces` flows

### 2. Add canonical scoped new-space route
In `frontend/src/router.ts`:
- add `/community/:communityId/new-space`
- route may render a small wrapper page or a full page component

If needed, create:
- `frontend/src/pages/NewSpace.vue`

### 3. Use locked mode from scoped shell
From current-community shell entry points (per the design in `./DECISIONS.md` "Shell information architecture"):
- the `+` revealed on hover/focus next to the "Spaces" header in the community sidebar (admin only)
- the "Create a space" CTA in the community sidebar's empty state (admin only)
- the mobile Home tab's "+ New space" affordance (admin only)

In all three cases:
- open the locked-community new-space flow with the current route `communityId`
- do not offer community selection there

### 4. Keep `/spaces` page global and intact
In `frontend/src/pages/Spaces/Spaces.vue`:
- keep the page global
- keep current management interactions
- only update any route links as needed for scoped navigation

### 5. Restrict `/spaces` to admins only
In `frontend/src/router.ts` (route guard) and `frontend/src/pages/Spaces/Spaces.vue`:
- detect admin via `user.roles.includes('Gameplan Admin')` from `useSessionUser()` in `frontend/src/data/users.ts`
- non-admins navigating to `/spaces` should be redirected away (e.g. to current community discussions). The `/spaces` rail icon is also hidden for non-admins (handled in Phase 02).
- admin users keep current management actions (create, move, merge, archive, etc.) unchanged

No read-only mode is required because non-admins never reach the page.

---

## Guardrails

- Do not change move-space implementation.
- Do not remove or expand `/spaces` admin actions.
- Do not convert `/spaces` into a scoped community page.

---

## Cypress coverage (required)

Add a spec (`cypress/e2e/community-spaces-guardrails.cy.ts`):
- as admin, the sidebar "Spaces" `+` opens the new-space flow with the community **locked** (no community picker) and creates a space in the current community
- as a non-admin, visiting `/spaces` redirects away and the rail `/spaces` icon is absent

See `./AGENT_RUNBOOK.md` for run commands and conventions.

---

## Verify before commit

- scoped new-space flow always creates in current community
- community picker is hidden in scoped mode
- community picker still exists in unlocked/global management mode
- `/spaces` remains global
- non-admin `/spaces` is read-only
- admin `/spaces` still has current management actions

---

## Suggested commit checkpoint

`feat(community): add scoped new space flow and guardrails for spaces page`
