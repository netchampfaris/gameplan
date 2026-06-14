# Phase 02 — Shell, sidebar, and mobile community UI

Status: done
Commit checkpoint: `8881be6a`
Notes:
- Initial pass added `CategorySwitcher`, `categorySpaces`, and a basic two-column shell.
- Rebuild landed against the updated design in `./DECISIONS.md` → "Shell information architecture": `AppRail`, `CategorySwitcherCombobox`, rewritten `AppSidebar`, mobile 4-tab bottom bar (Home/Inbox/Search/More), `MoreMenu`/`MobileMoreMenu`, and `shellPreferences` for the rail-top icon toggle.
- `CategorySidebar.vue`, `CategorySwitcher.vue`, and `MobileCategoryBar.vue` removed. `PersonalHome.vue` deletion deferred to Phase 09.
- Phase 04 renames active `Category*`/`category*` frontend shell code to `Community*`/`community*`.

Implementation style: Follow `./CODE_STYLE.md`. Match `frontend/src/data/session.ts` style where relevant: semantic state modules, VueUse to reduce boilerplate, strict scoped routes, explicit 404s, and minimal abstractions.

---

## Goal

Build the Slack-style three-column desktop shell (rail + community sidebar + content) and the drill-down mobile equivalent.

Authoritative design lives in `./DECISIONS.md` under "Shell information architecture". This file describes how to build it.

---

## Files

### Create
- `frontend/src/data/communitySpaces.ts` *(renamed from initial `categorySpaces.ts` in Phase 04)*
- `frontend/src/components/AppRail.vue` — narrow rail (rename of current `CategorySidebar.vue`, or new file)
- `frontend/src/components/CommunitySwitcherCombobox.vue` — combobox-with-custom-trigger for switching communities
- `frontend/src/components/MobileCommunitySpacesSheet.vue` *(recommended)*
- `frontend/src/components/MobileMoreMenu.vue` *(recommended)*

### Edit
- `frontend/src/components/AppSidebar.vue` — becomes the community sidebar
- `frontend/src/components/AppDropdown.vue` — broader app/community menu in the sidebar header
- `frontend/src/components/DesktopLayout.vue` — sidebar visibility + width transition
- `frontend/src/components/MobileLayout.vue` — 4-tab bottom nav + drill-down per tab
- `frontend/src/components/UserDropdown.vue` — wired into the rail bottom on desktop and into the More tab on mobile

### Delete (in this phase or queued for Phase 09)
- unused stale `Category*` shell components — remove once no call sites remain
- `frontend/src/pages/PersonalHome.vue` — supersedes Home semantics; rail Home goes to current community discussions

---

## Tasks

### 1. Build the narrow rail (`AppRail.vue`)
Width: 28px icon buttons inside `px-3` (≈52px total). Gray background (`bg-surface-menu-bar` or equivalent).

Vertical structure (top → bottom):
1. **Community icon** (28px). Renders `team.icon` emoji or first-letter fallback. Container is a rounded square sized to allow swapping in an `<img>` later without layout change.
   - Multi-community: clicking opens `CommunitySwitcherCombobox`.
   - Single-community: static badge — no click handler, no chevron, no hover affordance. Active highlight only on `/community/:communityId/*` routes.
2. **Group 1** (divider above and below): Home, Inbox, Search.
3. **Group 2**: Drafts, Bookmarks, Tasks, Pages.
4. **Group 3**: People, **Spaces** *(rendered only when `user.roles.includes('Gameplan Admin')`)*.
5. **Spacer** (`flex-1`) pushing avatar to the bottom.
6. **User avatar** at bottom — opens `UserDropdown` (profile, settings, log out, theme).

Per-icon requirements:
- Every icon has a tooltip (right-side, via `TooltipRoot`/`TooltipBubble` — pattern already in current `CategorySidebar.vue`).
- Active state when on the destination's route only. Search icon = active on `Search` route. Home = active on `Discussions` / `DiscussionsTab` routes.
- Search click navigates to `/search` page (the `Search` route). `Cmd+K` separately opens `CommandPalette`.

### 2. Build the community sidebar (rewrite `AppSidebar.vue`)
Width: `w-56` (224px). White background.

Top-row composite header (must align horizontally with the rail's community icon):
- Community name (text label) acting as the trigger for the app/community menu. Keep `▾` carat to signal interactivity.
- Drop duplicate community icon from the menu trigger (it's covered by the rail icon to the left).

Below the header:
- Row: "All discussions" → `{ name: 'Discussions', params: { communityId } }`. Active only on the canonical `Discussions` route (recent feed).
- Row: "Unread" → `{ name: 'DiscussionsTab', params: { communityId, feedType: 'unread' } }`. Optional trailing unread count badge.
- Row: "Participating" → `{ name: 'DiscussionsTab', params: { communityId, feedType: 'participating' } }`.
- These three rows replace the old tab strip on the discussions page. The discussions page reads the active feed type from the route name and renders accordingly.
- Section header: "Spaces" with a `+` revealed on hover and on focus-within (admin only). Click `+` opens the new-space flow with community locked to the displayed route community (Phase 07).
- Spaces list: current community spaces. Each row:
  - Leading: `<LucideGlobe />` if public, `<LucideLock />` if private. (Removes the existing emoji on the left and the trailing lock on the right.)
  - Title.
  - Trailing unread count if `> 0`.
  - Active state when on the exact `Space` (or nested `Space*`) route for this `spaceId`.
- No persistent footer.

Empty state (if current community spaces are empty):
- "No spaces in this community yet."
- Admin (`Gameplan Admin`) only: "Create a space" button → opens the locked-community new-space flow.
- This case should be rare — Phase 08 auto-creates a `General` space on community creation.

### 3. Build the community-switcher combobox (`CommunitySwitcherCombobox.vue`)
- Use frappe-ui's `Combobox` (or `Autocomplete`) with a custom trigger slot. The trigger is rendered by the rail icon.
- Popover: search input at top, scrollable list of `activeCommunities`, displayed community marked with a check.
- Selecting a community: persist via `communityState.change(communityId)`, then `router.push({ name: 'Discussions', params: { communityId } })`.
- Hide / no-op when only one active community exists (rail-top icon becomes a static badge in that case).

### 4. Sidebar visibility + width transition in `DesktopLayout.vue`
- Render the community sidebar only when the current route matches `/community/:communityId/*`.
- Use a width-animated wrapper around the sidebar (e.g. `<div class="transition-all duration-150 overflow-hidden" :class="onCategoryRoute ? 'w-56' : 'w-0'">`) so navigation between community and global routes slides instead of snaps.
- The rail itself is always visible.

### 5. Mobile shell rewrite (`MobileLayout.vue`)
- Bottom tab bar: **Home, Inbox, Search, More** (4 tabs).
- Each tab maintains its own navigation stack (drill-down). Tab bar persists when drilled in.

**Home tab:**
- Top bar: community name + switcher trigger (reuse `CommunitySwitcherCombobox` or a mobile-friendly variant).
- Body: "All discussions" row + spaces list (same data as desktop sidebar, rendered as full-width tappable rows). Each space row uses the same globe/lock leading icon.
- Tap a space → drill into that space's discussions.

**Inbox / Search tabs:**
- No community context at top. Direct destination content.

**More tab:**
- Full-page menu listing: Bookmarks, People, Pages, Tasks, Drafts. Add **Spaces** only when `user.roles.includes('Gameplan Admin')`.
- Bottom of menu: user avatar / settings / log out (`UserDropdown` content).

### 6. Retire preferred-home and `PersonalHome` from active code
- Remove `usePreferredHomePage()` references from shell code.
- Remove `HomePageSettingsDialog` from current shell flow.
- Mark `PersonalHome.vue` for deletion (Phase 09). Rail Home now targets `Discussions` directly.

---

## Guardrails

- `/spaces` remains a global page.
- Search/Tasks/Pages/People/Notifications remain global in content.
- Mobile must still offer quick access to current-community spaces — provided by the Home tab.
- Do not introduce per-route sidebar variants (e.g. People-specific sidebar). All global pages get full-width content with the sidebar hidden.

---

## Verify before commit

- Rail visible on every route.
- Community icon at top of rail acts as switcher when multiple communities exist; static badge when only one.
- Community sidebar visible only on `/community/:communityId/*` routes; transitions out smoothly on global routes.
- Composite header reads as one continuous element across rail + sidebar.
- Spaces list shows globe/lock leading icons; no emoji on space rows.
- `+` next to "Spaces" header is visible on hover and on keyboard focus (admin only).
- Empty-spaces state renders with admin CTA when applicable.
- Search rail icon → `/search` page. `Cmd+K` → palette. Both work.
- Mobile bottom tabs: Home, Inbox, Search, More. Home tab shows community context; other tabs do not.
- Tab bar persists when drilled into a space on mobile.
- Active states: only the exact current destination is highlighted (rail Home is *not* highlighted on a space-detail page).

---

## Suggested commit checkpoint

`feat(community): rebuild shell with rail and community sidebar`
