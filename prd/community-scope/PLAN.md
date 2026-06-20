# Community Scope

Execution plan for implementing community scope in **one branch** and **one pull request**.

Product and active frontend app language: the top-level entity is **Community**. The nested entity is **Space**.
Persisted/backend identifiers such as `GP Team`, document fields named `team`, and `pin_scope: 'Category'`
remain as-is until a separate schema/API rename is explicitly planned.

Product decisions and strategy principles: `./DECISIONS.md`
Implementation style guidelines: `./CODE_STYLE.md`

2026 UX amendment: `DECISIONS.md` is the source of truth for the current desired UX. The phase
files below are historical execution records and may mention superseded details such as saved home
community semantics, `/spaces` as the management URL, or deferred command palette work.

---

## Phase order

1. `phase-01-current-community-and-routing.md`
2. `phase-02-shell-sidebar-and-mobile-community-ui.md`
3. `phase-03-community-discussions-bookmarks-and-pins.md`
4. `phase-04-community-naming-alignment.md`
5. `phase-05-scoped-route-audit-and-space-navigation.md`
6. `phase-06-scoped-composer-and-drafts.md`
7. `phase-07-new-space-flow-and-spaces-page-guardrails.md`
8. `phase-08-onboarding-backend-and-migrations.md`
9. `phase-09-cleanup-regression-pass-and-pr-finish.md`

Do not skip ahead unless a phase explicitly says it can be parallelized.

---

## Dependency summary

- Phase 01 is foundational for everything else.
- Phase 02 depends on Phase 01.
- Phase 03 depends on Phases 01–02.
- Phase 04 depends on Phases 01–03 and aligns active app code with Community naming before more work lands.
- Phase 05 depends on Phase 04 and completes route/link consistency against `communityId`.
- Phase 06 depends on Phases 04–05.
- Phase 07 depends on Phases 01–02 and should use Phase 04 naming conventions.
- Phase 08 depends on the frontend route model being settled.
- Phase 09 is the final cleanup / regression pass.

---

## Commit guidelines

- Target **1–3 commits per phase**.
- Commit only when the app still runs and routing is internally consistent.
- Each phase file includes a suggested commit checkpoint message.

Branch name: `feature/community`

---

## Per-phase verification

After each phase:
- Verify touched routes still resolve.
- Verify touched pages load without console-breaking errors.
- Verify canonical route objects include `communityId` where required.
- Verify no global surface was accidentally community-filtered.
- Verify new code still follows `./CODE_STYLE.md`.
- Add focused automated tests where the phase changes brittle routing, persistence, or migration behavior. Comprehensive coverage is not required, but zero tests for the branch is not acceptable.
- Each phase ships at least one **simple, high-order Cypress spec** under `frontend/cypress/e2e/` proving its happy path; an independent verifier runs it before the phase is committed.

---

## AFK execution (autonomous workflow)

This branch is structured to run phase-by-phase via subagents: an **implementer** builds the phase and writes its Cypress spec, an **independent verifier** runs the gates, and the phase is committed only on pass. Implementers record any divergence from the plan back into `DECISIONS.md` / the phase `Notes`. The full protocol — roles, gates, test commands, status markers, guardrails — is in `./AGENT_RUNBOOK.md`. Read it before launching an autonomous run.

---

## Definition of done

The branch is ready for review when:
- There is no global discussions feed.
- `/` and `/home` resolve to community-scoped discussions or onboarding.
- Desktop rail shows Gameplan/Home, visible community shortcuts, a "More communities" overflow
  switcher when needed, global shortcuts, and the user avatar.
- Visiting a valid community-scoped route updates the current/last visited community.
- Sidebar shows current-community spaces and feed-type rows (All discussions / Participating / Unread). No tab strip on the discussions page.
- Global bookmarks route exists at `/bookmarks`.
- Scoped composer works from discussion list, space context, and command palette.
- Command palette "Add Discussion" opens the correct scoped composer from community/space/global
  contexts and never creates a draft before a space is selected.
- Legacy unscoped drafts still work.
- `/manage` is the canonical admin-only management route for communities, spaces, members, guests,
  and community images. `/spaces` is only a compatibility redirect; `/configure` should not remain
  the product URL.
- Non-admins are redirected away from management and the rail/manage entry point is hidden for them.
- User-facing community creation paths automatically add the creator as a member. If community owner/admin
  semantics ship, they are explicitly modeled rather than implied by global roles.
- Mobile Home is community-first: list communities, drill into a community menu, then drill into
  feeds/spaces with the bottom tab bar persistent.
- Existing sites with uncategorized spaces are migrated to a `Default` community. Fresh sites do not get `Default` — onboarding requires a user-named community.
- Discussion pin scope is migrated from `Global` to `Category`.
- Active frontend app code uses Community naming (`communityState`, `communities`, `communitySpaces`, `communityId`) while backend/schema names remain unchanged.
- Focused automated tests cover the riskiest route/persistence/migration changes made in this branch.
- Deferred to follow-ups: comprehensive automated tests beyond focused coverage, rollback patches,
  and deletion of legacy Team / Project page files after route stability is proven.
