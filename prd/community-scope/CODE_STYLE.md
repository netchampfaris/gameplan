# Community Scope Code Style

These guidelines define the implementation style for this PRD. Apply them across all phases.

Product and active frontend app language uses **Community** for the top-level entity and **Space** for the nested entity.
Persisted/backend identifiers still use `GP Team`, document fields named `team`, and `pin_scope: 'Category'`.
Keep those schema-bound names until a separate schema/API rename is explicitly planned.

## Principles

### Write app code, not framework code
- Prefer code that reads like product logic.
- Avoid infrastructure-heavy abstractions unless they clearly simplify the code.
- If a helper feels more generic than the problem, do not add it.

### Prefer semantic state modules
Use `frontend/src/data/session.ts` as the style reference.

Preferred shape:
```ts
communityState.id
communityState.doc
communityState.change(communityId)
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
Prefer names from the product model for active frontend app code and user-facing copy. Preserve backend/schema identifiers when reading or writing persisted fields.

Use:
- `community` in user-facing strings
- `communityState`
- `communityId`
- `communities`
- `communitySpaces`
- `scope`
- `change()` / semantic actions

Avoid:
- `activeCategory`, `categorySpaces`, `Category*` for active app code
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
- Canonical scoped routes must require `communityId`.
- Legacy routes should redirect into canonical routes.
- Invalid scoped routes should go to `NotFound`.

Prefer:
- inline redirects when the code stays small
- tiny route-specific helpers only when they clearly improve readability

Avoid:
- generic redirect wrappers
- broad routing abstractions like `withNavigationState`
- optional `communityId` in canonical scoped routes

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
communityState.id
communityState.doc
communityState.change(communityId)
```

`communityState` stores the deliberately selected/default community used by `/` and `/home` fallback behavior. It is not automatically updated by deep links. Scoped pages derive the displayed community from `route.params.communityId`.

### Route rules
Canonical scoped routes should look like:
- `/community/:communityId/discussions`
- `/community/:communityId/discussions/:feedType`
- `/community/:communityId/space/:spaceId`
- `/community/:communityId/new-discussion`

### Redirect rules
- Legacy URLs may redirect into canonical scoped URLs.
- Missing or inaccessible `communityId` should 404.
- Missing or inaccessible old `/space/:spaceId/...` links should 404.

### Naming
Prefer:
- `communityState`
- `NoCommunities`
- `NotFound`

Avoid:
- `activeCategory`
- `categorySpaces`
- `NoCategories`
- `collaboration`
- overly broad `context` naming unless it adds real clarity

### Schema boundary
- `communityId` may still be compared to schema fields like `space.team`.
- Do not add one-off wrappers just to hide schema field names.
- Prefer product-named helpers only when they clarify repeated schema-boundary logic.
- Generated types such as `GPTeam` should keep generated names. Alias locally only when it improves readability.
- Do not add compatibility exports or re-export files for old frontend names. This branch has not shipped.
