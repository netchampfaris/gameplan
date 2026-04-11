# Gameplan → v3 Data Fetching Migration Plan

## Overview

Migrate gameplan from frappe-ui v2 data fetching APIs (`useList`, `useDoc`, `useCall`, `useDoctype`, `useNewDoc`, `createListResource`, `createDocumentResource`, `createResource`, Options API `resources:`) to the v3 client (`defineDoctype` → `GPTask.getDoc()`, `GPTask.getList()`, `GPTask.newDoc()`, etc.).

**Source of truth:** `src/doctypes.ts` (auto-generated) + `src/client.ts` (already wired)

### Key API differences (v2 → v3)

| v2                                          | v3                                                                 | Notes                                                           |
| ------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `useDoc({ doctype, name })`                 | `GPTask.getDoc(name)`                                              | Returns `.doc`, `.loading`, `.error`, `.setValue.call()`        |
| `useList({ doctype, ... })`                 | `GPTask.getList({ filters, ... })`                                 | Returns `.data`, `.loading`, `.insert.call()`, `.delete.call()` |
| `useNewDoc(doctype, defaults)`              | `GPTask.newDoc(defaults)`                                          | Returns `.doc` (mutable), `.insert.call()`                      |
| `useDoctype(doctype).runDocMethod.submit()` | `task.myMethod.call()`                                             | Doc methods are on the handle                                   |
| `useDoctype(doctype).runMethod.submit()`    | `GPTask.myMethod.call()`                                           | Controller methods are on the doctype                           |
| `useDoctype(doctype).insert.submit()`       | `list.insert.call()` or `GPTask.newDoc().insert.call()`            |                                                                 |
| `useCall({ url })`                          | No direct equivalent — keep `useCall` for non-doctype RPCs         |                                                                 |
| `resource.submit(params)`                   | `operation.call(params)`                                           | `.submit()` → `.call()` everywhere                              |
| `resource.loading`                          | `handle.loading` or `handle.setValue.loading`                      | Same shape                                                      |
| `resource.data`                             | `handle.doc` (getDoc) or `handle.data` (getList/getCount)          |                                                                 |
| Options API `resources: {}`                 | Composition API `setup()`                                          | Must rewrite component to `<script setup>`                      |
| `$getDoc(doctype, name)`                    | Read from `store` directly or use a computed over existing handles |                                                                 |
| `$getDocumentResource(doctype, name)`       | `GPTask.getDoc(name)`                                              |                                                                 |
| `socket.on('new_activity', ...)`            | `socket.on('new_activity', ...)` — same API                        | Imported from `@/client`                                        |

---

## Phase 0: Prerequisites (already done)

- [x] `src/client.ts` — `createClient()` with cache, realtime, onError
- [x] `src/doctypes.ts` — 16 doctypes generated with interfaces + `defineDoctype` calls
- [x] `hooks.py` — `typescript_interface_generator` configured
- [x] Test pages (`TestPage.vue`, `TestTaskPage.vue`) validate the API works end-to-end
- [x] frappe API v2 server endpoints fully implemented and tested

---

## Phase 1: Data layer modules (`src/data/*.ts`)

These are the shared singletons/composables. Migrate them first since many components depend on them.

### 1.1 `data/teams.ts` — useList → GPTeam.getList

**Current:** `useList<Team>({ doctype: 'GP Team', ... })`
**Target:** `GPTeam.getList({ fields, orderBy, limit })`

```ts
// Before
import { useList } from 'frappe-ui'
export let teams = useList<Team>({ doctype: 'GP Team', ... })

// After
import { GPTeam } from '@/doctypes'
export let teams = GPTeam.getList({
  fields: ['name', 'title', 'icon', 'modified', 'creation', 'archived_at', 'is_private'],
  orderBy: 'title asc',
  limit: 999,
})
```

**API changes:**

- `teams.data` — same
- `teams.reload()` — same
- `teams.insert.submit(doc)` → `teams.insert.call(doc)` (used by `AddTeamDialog.vue`)
- Remove `cacheKey` / `initialData` / `immediate` (v3 fetches immediately, has IDB cache)

**Dependents to update:** `AddTeamDialog.vue` (`.insert.submit` → `.insert.call`), `groupedSpaces.ts`, `EditCategoryDialog.vue`

---

### 1.2 `data/spaces.ts` — useList + useCall + useDoctype → GPProject

**Current:** Three separate APIs:

- `useList<Space>({ doctype: 'GP Project', ... })` for the spaces list
- `useCall({ url: '.../get_joined_spaces' })` for joined spaces
- `useDoctype('GP Project')` for `runDocMethod` (join/leave/unarchive)

**Target:**

```ts
import { GPProject } from '@/doctypes'

// List
export let spaces = GPProject.getList({
  fields: ['name', 'title', 'icon', 'team', ...],
  orderBy: 'title asc',
  limit: 99999,
  transform(doc) { doc.name = doc.name.toString(); return doc },
})

// Joined spaces — controller method
export async function loadJoinedSpaces() {
  const result = await GPProject.getJoinedSpaces.call()
  joinedSpacesData.value = result
}

// Doc methods — now on the getDoc handle or called directly
export async function joinSpace(space: Space) {
  const handle = GPProject.getDoc(space.name)
  await handle.promise
  await handle.join.call()
  await loadJoinedSpaces()
}
```

**Note:** `useDoctype().runDocMethod.submit({ name, method })` becomes calling the method directly on a `getDoc` handle. `useDoctype().runMethod.submit({ method, params })` becomes calling the controller method on the doctype object.

**Also remove:** `isDocMethodLoading()` / `isMethodLoading()` helpers — v3 operations have `.loading` on each handle.

---

### 1.3 `data/pinnedSpaces.ts` — useList → GPPinnedProject.getList

**Current:** `useList<GPPinnedProject>({ ... })` with `.insert.submit()` / `.delete.submit()`
**Target:**

```ts
import { GPPinnedProject } from '@/doctypes'

export const pinnedSpaces = GPPinnedProject.getList({
  fields: ['project', 'team', 'user', 'name'],
  filters: { 'project.archived_at': ['=', null] },
  orderBy: 'creation desc',
  limit: 99999,
})

export function pinSpace(spaceId: string) {
  return pinnedSpaces.insert.call({ project: spaceId })
}

export function unpinSpace(spaceId: string) {
  let pin = pinnedSpaces.data?.find(...)
  if (pin) return pinnedSpaces.delete.call(pin.name.toString())
}
```

**API changes:**

- `.insert.submit(doc)` → `.insert.call(doc)`
- `.delete.submit({ name })` → `.delete.call(name)` (v3 delete takes a string name, not an object)
- `isPinActionLoading()` → use `pinnedSpaces.isItemLoading(pin.name, 'delete')` or `pinnedSpaces.isItemLoading(pin.name)` for any action

---

### 1.4 `data/discussions.ts` — useList + useDoc → GPDiscussion

**Current:** `useList` via custom API URL + `useDoc` with manual cache
**Target:**

```ts
import { GPDiscussion } from '@/doctypes'

// Custom API URL with the same params/response shape as standard getList
export function useDiscussions(options) {
  return GPDiscussion.getList({
    url: '/api/v2/method/gameplan.gameplan.doctype.gp_discussion.api.get_discussions',
    filters: options.filters,
    limit: options.limit || 50,
    orderBy: options.orderBy,
  })
}

// For single doc
export function useDiscussion(discussionId) {
  return GPDiscussion.getDoc(discussionId)
  // .trackVisit, .markAsUnread, .closeDiscussion etc. come from doctypes.ts docMethods
}
```

**Important:** The current `useList` calls a custom URL (`/api/v2/method/gameplan.../get_discussions`), not the standard document list endpoint. If this custom API returns extra computed fields (`project_title`, `last_post_at`, `unread`), you have two options:

1. Implement `get_list` on the GP Discussion controller to add those fields (preferred)
2. Keep `useCall` for this specific case and merge results into the store manually

**The manual `discussionsCache` can be removed** — v3 `getDoc` handles are automatically backed by the shared DocStore. Two `getDoc` calls for the same name share the same canonical data.

---

### 1.5 `data/tasks.ts` — useDoc with manual cache → GPTask.getDoc

**Current:** Manual `tasksCache` + `useDoc`
**Target:**

```ts
import { GPTask } from '@/doctypes'

export function useTask(taskId: MaybeRefOrGetter<string>) {
  return GPTask.getDoc(taskId)
  // .trackVisit comes from docMethods in doctypes.ts
}
```

The manual cache is **no longer needed** — v3 DocStore is the shared cache.

---

### 1.6 `data/tags.ts` — useList → GPTag.getList

```ts
import { GPTag } from '@/doctypes'
export const tags = GPTag.getList({ fields: ['name', 'label'], limit: 9999 })
```

---

### 1.7 `data/unreadCount.ts` — useCall + useDoctype → useCall + GPProject methods

**Current:** `useCall` for the RPC + `useDoctype('GP Project')` for `runDocMethod`
**Target:**

```ts
import { GPProject } from '@/doctypes'

// Keep useCall for the non-doctype RPC (get_unread_count is on GP Unread Record)
const unreadCountByProjects = useCall<...>({ url: '...', ... })

// Replace useDoctype.runDocMethod:
export function markSpaceAsRead(spaceId: string) {
  const handle = GPProject.getDoc(spaceId)
  return handle.promise.then(() => handle.markAllAsRead.call())
    .then(() => refreshUnreadCountForProjects([spaceId]))
}

// Replace useDoctype.runMethod:
export function markSpacesAsRead(spaceIds: string[]) {
  return GPProject.markAllAsRead.call({ spaces: spaceIds })
    .then(() => refreshUnreadCountForProjects(spaceIds))
}
```

---

### 1.8 `data/notifications.ts` — useCall (keep as-is)

`useCall` for a generic RPC that isn't doctype-bound. **No change needed** unless you want to migrate to `GPNotification.getCount()` or similar.

---

### 1.9 `data/users.ts` — useCall (keep as-is)

Custom RPC returning user info. **No change needed** — this is not a doctype-shaped API.

---

### 1.10 `data/apps.ts` — useCall (keep as-is)

Custom RPC. **No change.**

---

### 1.11 `data/session.ts` — useCall (keep as-is)

Login/logout RPCs. **No change.**

---

### 1.12 `data/reactions.ts` — useCall (keep as-is)

Calls `react` doc method via a dynamic URL. **No change needed** — this is a generic reaction system that works across doctypes.

---

### 1.13 `data/projects.js` → Delete

This file duplicates `data/spaces.ts` (same `GP Project` list with nearly identical fields). It uses the old `createListResource` / `createDocumentResource` APIs.

**Action:** Delete this file. Update any remaining imports to use `data/spaces.ts` instead. The `useProject` function in this file becomes `GPProject.getDoc(projectId)`.

---

### 1.14 `data/newDoc.js` → Delete

Generic `createResource` wrapper for `frappe.client.insert`. **Replaced by** `GPTask.newDoc()` / `GPProject.newDoc()` etc.

---

### 1.15 `data/newComment.ts` — No change

Just a `ref(false)` for UI state. Not data-fetching related.

---

### 1.16 `data/groupedSpaces.ts` — No change

Pure computed over `spaces.data` and `teams.data`. Will work as-is once those are migrated (they expose `.data` in both v2 and v3).

---

## Phase 2: Composition API components (script setup)

These use `useList`, `useDoc`, `useCall`, `useDoctype`, `useNewDoc` in `<script setup>`.

### 2.1 Components using useList

| File                      | Current                                                        | Target                                                            |
| ------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `TaskList.vue`            | `useList<GPTask>({ ... })`                                     | `GPTask.getList({ ... })`                                         |
| `CommentsArea.vue`        | `useList<GPComment>`, `useList<GPActivity>`, `useList<GPPoll>` | `GPComment.getList()`, `GPActivity.getList()`, `GPPoll.getList()` |
| `CommentsList.vue`        | `useList<GPComment>`, `useList<Activity>`                      | `GPComment.getList()`, `GPActivity.getList()`                     |
| `InvitePeople.vue`        | `useList<GPInvitation>`                                        | `GPInvitation.getList()`                                          |
| `ManageMembersDialog.vue` | `useList<GuestAccess>`, `useList<PendingInvitation>`           | `GPGuestAccess.getList()`, `GPInvitation.getList()`               |
| `Drafts.vue`              | `useList<Draft>`                                               | `GPDraft.getList()`                                               |
| `PageGrid.vue`            | `useList<Page>`                                                | `GPPage.getList()`                                                |

**Pattern for each:**

```ts
// Before
const tasks = useList<GPTask>({
  doctype: 'GP Task',
  url: '...', // optional custom URL
  filters: { ... },
  fields: [...],
  orderBy: '...',
  limit: 20,
  cacheKey: '...',
  immediate: true,
})
tasks.insert.submit(doc)
tasks.delete.submit({ name })
tasks.setValue.submit({ name, field: value })

// After
const tasks = GPTask.getList({
  filters: { ... },
  fields: [...],
  orderBy: '...',
  limit: 20,
})
tasks.insert.call(doc)
tasks.delete.call(name)         // string, not object
tasks.setValue.call({ name, field: value })
```

**Key differences:**

- Remove `doctype`, `url`, `cacheKey`, `immediate`, `initialData` options
- `.submit(params)` → `.call(params)` everywhere
- `.delete.submit({ name })` → `.delete.call(name)` (takes string)
- `.delete.params` / `.insert.params` — not available; track loading per-item differently
- Custom `url` on useList → must use the standard list endpoint or keep the custom URL as a separate `useCall`

---

### 2.2 Components using useDoc (via data layer composables)

| File                 | Current                             | Target                                                 |
| -------------------- | ----------------------------------- | ------------------------------------------------------ |
| `TaskDetail.vue`     | Uses `useTask()` composable         | Same composable, now backed by `GPTask.getDoc()`       |
| `DiscussionView.vue` | Uses `useDiscussion()` composable   | Same composable, now backed by `GPDiscussion.getDoc()` |
| `Page.vue`           | `useDoc<GPPage>({ doctype, name })` | `GPPage.getDoc(() => props.pageId)`                    |

**Pattern:**

```ts
// Before
const page = useDoc<GPPage>({ doctype: 'GP Page', name: () => props.pageId })
page.onSuccess((doc) => { ... })
page.setValue.submit({ title: '...' })

// After
const page = GPPage.getDoc(() => props.pageId, {
  onSuccess: (doc) => { ... },
})
page.setValue.call({ title: '...' })
```

**Key differences:**

- `useDoc({ doctype, name, methods })` → `GPTask.getDoc(name)` — methods come from `doctypes.ts`
- `.onSuccess(cb)` → pass `onSuccess` in options
- `.submit()` → `.call()` everywhere
- `doc.trackVisit.submit()` → `doc.trackVisit.call()`

---

### 2.3 Components using useDoctype (for runDocMethod / insert)

| File                            | Current                                          | Target                                   |
| ------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| `EditSpaceDialog.vue`           | `useDoctype('GP Project').setValue.submit()`     | `GPProject.getDoc(name).setValue.call()` |
| `ChangeSpaceCategoryDialog.vue` | `useDoctype('GP Project').setValue.submit()`     | Same                                     |
| `EditCategoryDialog.vue`        | `useDoctype('GP Team').setValue.submit()`        | `GPTeam.getDoc(name).setValue.call()`    |
| `ManageMembersDialog.vue`       | `useDoctype('GP Project').runDocMethod.submit()` | `GPProject.getDoc(name).method.call()`   |
| `SpaceOptions.vue`              | `useDoctype('GP Project').delete.submit()`       | `GPProject.getDoc(name).delete.call()`   |
| `MergeSpaceDialog.vue`          | `useDoctype('GP Project').runDocMethod.submit()` | `GPProject.getDoc(name).method.call()`   |
| `Space.vue`                     | `useDoctype('GP Project').setValue.submit()`     | `GPProject.getDoc(name).setValue.call()` |

**Pattern:**

```ts
// Before
const spaces = useDoctype<GPProject>('GP Project')
spaces.setValue.submit({ name: props.spaceId, title: '...' })
spaces.delete.submit({ name: props.spaceId })
spaces.runDocMethod.submit({ name: props.spaceId, method: 'archive' })

// After
const space = GPProject.getDoc(() => props.spaceId)
space.setValue.call({ title: '...' })
space.delete.call()
space.archive.call() // doc method from doctypes.ts
```

---

### 2.4 Components using useNewDoc

| File                  | Current                                    | Target                             |
| --------------------- | ------------------------------------------ | ---------------------------------- |
| `NewSpaceDialog.vue`  | `useNewDoc('GP Project', defaults)`        | `GPProject.newDoc(defaults)`       |
| `CommandPalette.vue`  | `useNewDoc('GP Page', { ... })`            | `GPPage.newDoc({ ... })`           |
| `SpacePages.vue`      | `useNewDoc('GP Page', { ... })`            | `GPPage.newDoc({ ... })`           |
| `MyPages.vue`         | `useNewDoc('GP Page', { ... })`            | `GPPage.newDoc({ ... })`           |
| `Search.vue`          | `useNewDoc('GP Search Feedback', { ... })` | `GPSearchFeedback.newDoc({ ... })` |
| `useNewDiscussion.ts` | `useNewDoc('GP Draft', { ... })`           | `GPDraft.newDoc({ ... })`          |
| `useAutoSave.ts`      | `useNewDoc('GP Draft', { ... })`           | `GPDraft.newDoc({ ... })`          |

**Pattern:**

```ts
// Before
const newSpace = useNewDoc<GPProject>('GP Project', { title: '', team: '' })
newSpace.submit().then(...)
newSpace.loading
newSpace.error

// After
const newSpace = GPProject.newDoc({ title: '', team: '' })
newSpace.insert.call().then(...)
newSpace.insert.loading
newSpace.insert.error
newSpace.doc.title = 'New Space'  // direct mutation
```

---

### 2.5 Components using useCall (keep most, migrate some)

| File                   | useCall purpose     | Action                                            |
| ---------------------- | ------------------- | ------------------------------------------------- |
| `InvitePeople.vue`     | `inviteByEmail` RPC | **Keep** — generic RPC                            |
| `RevisionsDialog.vue`  | Fetch revisions     | **Keep** — not a doctype list                     |
| `CommandPalette.vue`   | Title search RPC    | **Keep**                                          |
| `LastPostReminder.vue` | Custom RPC          | **Keep**                                          |
| `SpaceDiscussions.vue` | Bulk move RPC       | **Keep**                                          |
| `Drafts.vue`           | Delete drafts RPC   | Could migrate to `GPDraft.bulkDelete.call(names)` |
| `Login.vue`            | Auth providers      | **Keep**                                          |
| `Search.vue`           | Search RPC          | **Keep**                                          |
| `Onboarding.vue`       | Onboarding RPC      | **Keep**                                          |

**Rule:** If the call is a generic RPC (not CRUD on a doctype), keep `useCall`. If it maps to a doctype operation (bulk delete, etc.), migrate.

---

### 2.6 Socket usage (CommentsArea.vue, CommentsList.vue)

Both import `socket` from `@/client` and use `socket.on('new_activity', ...)`.

**v3 client exports `socket`** with the same API:

```ts
import { socket } from '@/client' // already works
socket.on('new_activity', handler) // same API
```

**No change needed** for raw socket usage. The automatic `list_update` → refetch behavior is handled by `getList` internally when `realtime: true` is set on the client.

---

## Phase 3: Options API components → Composition API

These 11 files use the Options API `resources:` block and must be rewritten to `<script setup>`.

### Priority order (by dependency/complexity):

| #   | File                                    | Resources                                                   | Complexity |
| --- | --------------------------------------- | ----------------------------------------------------------- | ---------- |
| 1   | `TextEditorTaskExtension/Component.vue` | 1 document resource                                         | Low        |
| 2   | `ProjectPages.vue`                      | 1 insert resource                                           | Low        |
| 3   | `ProjectDiscussionNew.vue`              | 1 insert resource                                           | Low        |
| 4   | `UnsplashImageBrowser.vue`              | 1 API call                                                  | Low        |
| 5   | `Settings/Members.vue`                  | 2 API calls                                                 | Medium     |
| 6   | `TeamLayout.vue`                        | 1 document resource                                         | Medium     |
| 7   | `ProjectLayout.vue`                     | 1 document resource                                         | Medium     |
| 8   | `Project.vue`                           | Receives project as prop (from ProjectLayout) + breadcrumbs | Medium     |
| 9   | `Poll.vue`                              | 1 document resource + whitelisted methods                   | Medium     |
| 10  | `People.vue`                            | 1 list resource                                             | Medium     |
| 11  | `Notifications.vue`                     | 2 list resources + 1 API call                               | Medium     |
| 12  | `PersonProfile.vue`                     | 2 document resources                                        | Medium     |

**Example rewrite (ProjectLayout.vue):**

```vue
<!-- Before (Options API) -->
<script>
export default {
  props: ['team', 'projectId'],
  resources: {
    project() {
      return {
        type: 'document',
        doctype: 'GP Project',
        name: this.projectId,
        whitelistedMethods: { archive: 'archive', ... },
        onSuccess() { this.$resources.project.trackVisit.submit() },
      }
    },
  },
}
</script>

<!-- After (script setup + v3) -->
<script setup lang="ts">
import { GPProject } from '@/doctypes'

const props = defineProps<{ team: any; projectId: string }>()

const project = GPProject.getDoc(() => props.projectId, {
  onSuccess: () => {
    project.trackVisit.call()
  },
})
</script>
```

**For DiscussionBreadcrumbs.vue** (uses `$getDoc`): Replace with a computed reading from the shared store, or pass the title as a prop from the parent which already has the data.

**For Project.vue** (uses `$getDocumentResource`): The breadcrumb building uses `$getDocumentResource` to read titles for tasks/discussions/pages in the current route. Migrate to `GPTask.getDoc(id)`, `GPDiscussion.getDoc(id)`, `GPPage.getDoc(id)` and read `.doc?.title`.

---

## Phase 4: Cleanup

### 4.1 Delete obsolete files

- [ ] `data/projects.js` — fully replaced by `data/spaces.ts`
- [ ] `data/newDoc.js` — replaced by `.newDoc()`
- [ ] `types/doctypes.ts` — replaced by `src/doctypes.ts` (which has both types AND runtime objects)

### 4.2 Update all imports

- [ ] `from '@/types/doctypes'` → `from '@/doctypes'` (33 files)
- [ ] Remove all `import { useList, useDoc, useDoctype, useNewDoc } from 'frappe-ui'`
- [ ] Remove all `import { createListResource, createDocumentResource, createResource } from 'frappe-ui'`

### 4.3 Remove global properties

In `main.js`, remove (if no longer used after migration):

- `$getDoc` — replaced by store reads
- `$getDocumentResource` — replaced by `GPX.getDoc()`

### 4.4 Remove test pages

- [ ] `TestPage.vue`, `TestPage2.vue`, `TestTaskPage.vue` — scaffolding, no longer needed

---

## Migration order summary

```
Phase 1: Data layer (src/data/)
  1.  data/teams.ts
  2.  data/tags.ts
  3.  data/pinnedSpaces.ts
  4.  data/tasks.ts
  5.  data/discussions.ts
  6.  data/spaces.ts
  7.  data/unreadCount.ts
  8.  Delete data/projects.js, data/newDoc.js

Phase 2: Composition API components
  9.  TaskList.vue
  10. TaskDetail.vue
  11. CommentsArea.vue + CommentsList.vue
  12. Page.vue
  13. PageGrid.vue + SpacePages.vue + MyPages.vue
  14. NewSpaceDialog.vue
  15. ManageMembersDialog.vue + InviteGuestDialog.vue
  16. EditSpaceDialog.vue + ChangeSpaceCategoryDialog.vue
  17. SpaceOptions.vue + MergeSpaceDialog.vue
  18. EditCategoryDialog.vue
  19. Space.vue
  20. Drafts.vue
  21. NewDiscussion/ (useNewDiscussion.ts + useAutoSave.ts)
  22. CommandPalette.vue
  23. Search.vue (useNewDoc part only)
  24. InvitePeople.vue

Phase 3: Options API → Composition API rewrites
  25. TextEditorTaskExtension/Component.vue
  26. ProjectPages.vue
  27. ProjectDiscussionNew.vue
  28. UnsplashImageBrowser.vue
  29. Settings/Members.vue
  30. TeamLayout.vue
  31. ProjectLayout.vue
  32. Project.vue
  33. Poll.vue
  34. People.vue
  35. Notifications.vue
  36. PersonProfile.vue
  37. DiscussionBreadcrumbs.vue

Phase 4: Cleanup
  38. Delete types/doctypes.ts, data/projects.js, data/newDoc.js
  39. Update all imports (33 files: @/types/doctypes → @/doctypes)
  40. Remove unused frappe-ui imports
  41. Remove test pages
```

---

## ~~Decisions needed before starting~~ Resolved

1. **Custom list URLs** — `getList` now accepts a `url` option. The custom URL receives the same query params (`filters`, `fields`, `order_by`, `start`, `limit`) and must return the same response shape (`{ data: [...], has_next_page: bool }`). Migration for `discussions.ts`:
   ```ts
   GPDiscussion.getList({
     url: '/api/v2/method/gameplan.gameplan.doctype.gp_discussion.api.get_discussions',
     filters: options.filters,
     limit: options.limit || 50,
   })
   ```

2. **`data/projects.js` duplication** — Delete it. Update imports to use `data/spaces.ts`.

3. **`isItemLoading` pattern** — `getList` now exposes `list.isItemLoading(name, action?)`. Tracks `setValue` and `delete` operations per document name. If `action` is omitted, returns `true` if *any* action is in flight for that item. Replaces the old `.params`-checking pattern:
   ```ts
   // Before (v2)
   pinnedSpaces.delete.loading && pinnedSpaces.delete.params?.name === pin.name

   // After (v3)
   pinnedSpaces.isItemLoading(pin.name, 'delete')
   ```

4. **Doctype-level `setValue`** — `GPProject.setValue.call({ name, ...fields })` patches any document without creating a `getDoc` handle. Updates the canonical DocStore so all existing handles reflect the change. Supports `callOptimistic` with automatic rollback. Replaces `useDoctype().setValue.submit()` and `useDoctype().runDocMethod.submit()`:
   ```ts
   // Before (v2)
   const spaces = useDoctype<GPProject>('GP Project')
   spaces.setValue.submit({ name: props.spaceId, title: 'New Title' })

   // After (v3)
   GPProject.setValue.call({ name: props.spaceId, title: 'New Title' })
   ```
