# Community Scope Code Style

These guidelines define the implementation style for this PRD. Apply them across all phases.

Product language uses **Community** for the top-level entity and **Space** for the nested entity.
Existing implementation identifiers still use `category` and `team` in many places; keep those names
when changing them would create churn unrelated to this PRD.

## Principles

### Write app code, not framework code
- Prefer code that reads like product logic.
- Avoid infrastructure-heavy abstractions unless they clearly simplify the code.
- If a helper feels more generic than the problem, do not add it.

### Prefer semantic state modules
Use `frontend/src/data/session.ts` as the style reference.

Preferred shape:
```ts
activeCategory.id
activeCategory.team
activeCategory.change(teamId)
```

Prefer:
- one semantic exported object
- state and actions grouped together
- APIs that read naturally at the call site

Avoid:
- many detached utility functions
- generic resolver-style files
- abstraction layers that hide simple domain behavior

### Use domain and implementation language deliberately
Prefer names from the product model for user-facing copy and new concepts. Preserve current
implementation identifiers when touching existing code.

Use:
- `community` in user-facing strings
- `activeCategory`
- `category`
- `teamId`
- `scope`
- `change()` / semantic actions

Avoid:
- vague terms like `collaboration`
- generic helper names that do not map to product concepts

### Use VueUse when it reduces boilerplate
Prefer VueUse utilities where they make the code smaller and clearer.

Examples:
- `useLocalStorage`
- `until`

Do not add VueUse just because it exists. Use it when it improves readability.

### Expose only what is needed
Export the minimum state and actions required by the feature.

Do not add extra derived fields or helpers unless they are used by the functionality.

### Keep router code strict and explicit
- Canonical scoped routes must require `teamId`.
- Legacy routes should redirect into canonical routes.
- Invalid scoped routes should go to `NotFound`.

Prefer:
- inline redirects when the code stays small
- tiny route-specific helpers only when they clearly improve readability

Avoid:
- generic redirect wrappers
- broad routing abstractions like `withNavigationState`
- optional `teamId` in canonical scoped routes

### Preserve query and hash only when needed
Do not preserve query params or hash by default.

Keep them only when product behavior depends on them, like:
- comment anchors
- draft links
- meaningful deep-link state

### Prefer small explicit code
If the code is already short and readable, keep it inline.

Extract only when:
- logic is repeated
- inline code becomes noisy
- naming the logic makes it easier to understand

### Prefer readability over defensiveness
Do not add extra layers of indirection just in case.

Keep control flow straightforward and easy to scan.

### Match existing project style
When there are multiple valid implementations, prefer the one that looks closest to the existing project style.

Use `frontend/src/data/session.ts` as the primary frontend reference.

### Make 404 behavior explicit
For invalid scoped URLs:
- show `NotFound`
- do not silently reroute to another community

This also applies to legacy scoped URLs that can no longer be resolved.

### Comments explain why
- Comment intent, not mechanics.
- Prefer clear naming over narration.

## Conventions for this PRD

### State modules
Preferred shape:
```ts
activeCategory.id
activeCategory.team
activeCategory.change(teamId)
```

### Route rules
Canonical scoped routes should look like:
- `/c/:teamId/discussions`
- `/c/:teamId/discussions/:feedType`
- `/c/:teamId/space/:spaceId`
- `/c/:teamId/new-discussion`

### Redirect rules
- Legacy URLs may redirect into canonical scoped URLs.
- Missing or inaccessible `teamId` should 404.
- Missing or inaccessible old `/space/:spaceId/...` links should 404.

### Naming
Prefer:
- `activeCategory`
- `NoCategories`
- `NotFound`

Avoid:
- `collaboration`
- overly broad `context` naming unless it adds real clarity
