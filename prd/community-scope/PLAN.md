# Community Scope

Execution plan for implementing community scope in **one branch** and **one pull request**.

Product language: the top-level user-facing entity is **Community**. The nested entity is **Space**.
Implementation identifiers such as `GP Team`, `teamId`, `activeCategory`, `categorySpaces`, and
`pin_scope: 'Category'` remain as-is in this PRD when they refer to current code or persisted values.

Product decisions and strategy principles: `./DECISIONS.md`
Implementation style guidelines: `./CODE_STYLE.md`

---

## Phase order

1. `phase-01-current-community-and-routing.md`
2. `phase-02-shell-sidebar-and-mobile-community-ui.md`
3. `phase-03-community-discussions-bookmarks-and-pins.md`
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

Branch name: `feature/community`

---

## Per-phase verification

After each phase:
- Verify touched routes still resolve.
- Verify touched pages load without console-breaking errors.
- Verify route objects include `teamId` where required.
- Verify no global surface was accidentally community-filtered.
- Verify new code still follows `./CODE_STYLE.md`.

---

## Definition of done

The branch is ready for review when:
- There is no global discussions feed.
- `/` and `/home` resolve to community-scoped discussions or onboarding.
- Community switcher is visible in the shell (hidden when only one community).
- Sidebar shows current-community spaces and feed-type rows (All discussions / Unread / Participating). No tab strip on the discussions page.
- Global bookmarks route exists at `/bookmarks`.
- Scoped composer works; "+ New discussion" is reachable only from inside the community discussions list.
- Legacy unscoped drafts still work.
- `/spaces` is admin-only — non-admins are redirected away and the rail icon is hidden for them.
- Existing sites with uncategorized spaces are migrated to a `Default` community. Fresh sites do not get `Default` — onboarding requires a user-named community.
- Discussion pin scope is migrated from `Global` to `Category`.
- Deferred to follow-ups: command palette "Add discussion", automated tests, rollback patches.
