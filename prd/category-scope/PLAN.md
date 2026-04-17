# Category-Scoped Collaboration

Execution plan for implementing category-scoped collaboration in **one branch** and **one pull request**.

Product decisions and strategy principles: `./DECISIONS.md`

---

## Phase order

1. `phase-01-current-category-and-routing.md`
2. `phase-02-shell-sidebar-and-mobile-category-ui.md`
3. `phase-03-category-discussions-bookmarks-and-pins.md`
4. `phase-04-scoped-route-audit-and-space-navigation.md`
5. `phase-05-scoped-composer-and-drafts.md`
6. `phase-06-new-space-flow-and-spaces-page-guardrails.md`
7. `phase-07-onboarding-backend-and-migrations.md`
8. `phase-08-cleanup-regression-pass-and-pr-finish.md`

Do not skip ahead unless a phase explicitly says it can be parallelized.

---

## Dependency summary

- Phase 01 is foundational for everything else.
- Phase 02 depends on Phase 01.
- Phase 03 depends on Phases 01–02.
- Phase 04 depends on Phase 01 and usually follows Phase 03.
- Phase 05 depends on Phases 01 and 04.
- Phase 06 depends on Phases 01–02.
- Phase 07 depends on the frontend route model being settled.
- Phase 08 is the final cleanup / regression pass.

---

## Commit guidelines

- Target **1–3 commits per phase**.
- Commit only when the app still runs and routing is internally consistent.
- Each phase file includes a suggested commit checkpoint message.

Branch name: `feature/category-scope`

---

## Per-phase verification

After each phase:
- Verify touched routes still resolve.
- Verify touched pages load without console-breaking errors.
- Verify route objects include `teamId` where required.
- Verify no global surface was accidentally category-filtered.

---

## Definition of done

The branch is ready for review when:
- There is no global discussions feed.
- `/` and `/home` resolve to category-scoped discussions or onboarding.
- Category switcher is visible in the shell (hidden when only one category).
- Sidebar shows only current-category spaces.
- Global bookmarks route exists at `/bookmarks`.
- Scoped composer works.
- Legacy unscoped drafts still work.
- `/spaces` remains global and read-only for non-admins (`Gameplan Admin` role gates admin actions).
- Uncategorized spaces are migrated to `Default`.
- Discussion pin scope is migrated from `Global` to `Category`.
