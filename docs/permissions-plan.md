# Permissions plan — scoped Community Admin + enforcement

Status: **not started**. Execution model: **tracer bullets** — each phase is a vertical
slice (backend + UI together) that ends green (unit + Cypress). **Stop for manual review
after every phase before starting the next.**

## Role model

Global Frappe roles stay: **Gameplan Admin (GA)** / **Member** / **Guest**.
**Community Admin (CA)** is *not* a 4th global role — it is an `is_admin` flag on a user's
membership row in a specific community (`GP Team.members`). One user can be a plain Member
of community A and a CA of community B at once.

| Role | Scope | Can |
|---|---|---|
| Gameplan Admin | Global super-admin | Anything, any community/space; only GA mints another GA |
| Community Admin | One community | Invite to / manage members of / set role within / moderate public content of *that* community |
| Member | Global | Participate; create communities (becomes CA of it) and spaces (incl. private); edit own content |
| Guest | Scoped spaces | Read (and comment where allowed) only in spaces granted via `GP Guest Access` |

### Escalation invariant (the security spine)
Granting global power requires already having global power. Only a GA can mint a GA. A CA
can only grant community-scoped power within their own community. Every negative test is a
restatement of this.

## Locked decisions

- **OPEN-1** Private spaces stay member-private; CAs do **not** auto-see them. Members can
  create private spaces. Community admin scope = public spaces + community settings + members.
- **OPEN-2** Space creator = normal member. No space-admin tier.
- **OPEN-3** Deactivate/remove a user from the instance = **GA only**.
- **OPEN-4** CAs may **delete / hide / lock** others' content, **not edit** it. Editing is
  owner-only. (⇒ content perms tighten: member `write` becomes `if_owner`, with CA/GA delete
  override. `hide`/`lock` states are a fast-follow.)
- **OPEN-5** A CA **cannot** remove or demote a Gameplan Admin in their community.

## Live gaps this closes (found during analysis)

- `GP Team.add_members` / `remove_member` are whitelisted with **no admin gate** — today any
  Member can add/remove members of any community. Must require `require_community_admin`.
- Global Settings → Members/Invites tabs render for **everyone** (`SettingsDialog.vue`). Global
  role management (incl. minting a GA) must become GA-only.
- Content has no ownership enforcement (`GP Discussion` member `write/delete`, `if_owner=None`).
  Tighten per OPEN-4.

---

## Tracer bullets

Each bullet: schema → backend gate → API → `has_permission` → frontend composable → one real
UI control → unit + Cypress. **Backend gate + unit test land before the UI control in the same
slice.** Review gate at the end of each.

### TB1 — Promote a member to Community Admin *(architecture proof)*
- Schema: add `is_admin` (Check) to `GP Member` (`gp_member.json`); document it's only consulted
  for `GP Team` parents.
- Seed: `GP Team.before_insert` → creator added as member `is_admin=1` (CC-1).
- Backend: `is_community_admin(community, user)` + `require_community_admin(community)`.
- API: `change_community_role(community, user, make_admin)` — rejects granting GA (RC-2) and GA
  targets (OPEN-5).
- Frontend: `isCommunityAdmin()` in `data/communities.ts`; `usePermissions.canManageCommunity`.
- UI: "Make / Remove community admin" in `Configure/MemberOptions.vue`, gated, confirm dialog,
  `communities.reload()` on success; role pill in `MemberRow.vue`.
- Tests: unit (CC-1, RC-1, RC-5/B-3, RC-4); Cypress (CA promotes; Member sees no control + 403).
- **Done:** unit + Cypress green; reviewer can promote/demote a CA in the running app.

### TB2 — Invite someone to my community
- API: `invite_by_email(..., community)` scoping + role allowlist (Member/CA, never GA);
  `GP Invitation.team` + `accept()` applies role/grant.
- UI: community-scoped invite affordance on Configure members surface (role options exclude GA);
  pending list + revoke, scoped to the community.
- Tests: unit (IN-2/3/4); Cypress (CA invites Member & CA; can't invite GA; CA of A can't invite to B).

### TB3 — Add / remove community members
- Backend: gate `GP Team.add_members` & `remove_member` with `require_community_admin` (closes gap).
- UI: gate "Add members" + "Remove from community"; last-admin guard (EDGE-2); hide on GA targets.
- Tests: unit (CA-5, B-2, EDGE-2); Cypress (CA adds/removes; Member blocked).

### TB4 — Global role management is GA-only
- UI: `SettingsDialog.vue` Members/Invites tabs gated to GA; `InvitePeople`/global `Members`
  GA-only; route guards for community-management routes.
- Backend: `change_user_role` / `remove_user` stay `require_admin` (GA).
- Tests: Cypress (non-GA: tabs absent; GA: mints a GA). Closes the defense-in-depth gap.

### TB5 — Content moderation (delete; lock/hide fast-follow)
- Backend: tighten content `has_permission` (owner-edit, CA/GA-delete) + `if_owner` on doctype perms.
- UI: action-menu visibility via `canEditContent` (owner) / `canModerate` (owner+CA+GA).
- Tests: unit (CT-1/2); Cypress (non-owner Member can't edit/delete; CA/GA can delete).
- Follow-up: `is_locked` / `is_hidden` states + lock toggle UI.

### TB6 — Hardening & polish
- Migration patch: backfill `is_admin` for existing communities (every community keeps ≥1 admin;
  dry-run, log orphans). Register in `patches.txt`.
- Role badges incl. `PersonProfile.vue`; mobile "Manage" gating (`MobileMoreMenu.vue`).
- Remove dead `ManageMembersMixin.invite_members`.
- Docs: `AGENTS.md` role model + this file's outcomes.

---

## Story → test matrix

| Story | Where enforced | Test |
|---|---|---|
| CC-1 creator becomes CA | `GP Team.before_insert` | unit |
| RC-1 CA promotes to CA | `change_community_role` | unit + Cypress |
| RC-2 / B-3 CA can't mint GA | `change_community_role` / invite | unit + Cypress |
| RC-4 no self-escalation | all role endpoints | unit + Cypress |
| RC-5 / B-1 CA scope = own community | `require_community_admin` | unit |
| B-2 Member can't manage members | gated team methods | unit + Cypress |
| IN-2/3/4 invite scope + role limit | `invite_by_email` / `GP Invitation` | unit + Cypress |
| CA-5 remove member | `remove_member` | unit + Cypress |
| EDGE-1/2 last GA / last CA | role/leave endpoints | unit |
| OPEN-5 / B-6 can't touch a GA | `change_community_role` / `remove_member` | unit |
| CT-1/2 owner-edit, admin-delete | content `has_permission` | unit + Cypress |
| TB4 global tabs GA-only | `SettingsDialog` + guards | Cypress |

## Risks / notes

- **Demo-site verification:** Cypress runs against the built bundle on `gameplan-demo.test`;
  any frontend change needs `yarn build` before the spec sees it. Confirm host routing before
  running (clear_data wipes the resolved site).
- **Test isolation:** `clear_data` does not reset *kept* users (john, and the new CA fixture
  `carol@example.com`); normalize role/enabled in `beforeEach`.
- **Shared `GP Member` table:** `is_admin` is only meaningful on `GP Team` rows; never consult it
  for `GP Project` membership.
- **Private-space privacy:** the Configure members surface manages public membership only — never
  surface private-space rosters to a CA.

## Operating contract

- Each phase = vertical slice (backend + UI). No horizontal "all backend then all UI".
- After every phase: stop, present diff + green test output + how-to-verify-in-app, and **ask for
  manual review** before proceeding.
- Branch: `feature/community-roles` off `feature/community` (proposed).
