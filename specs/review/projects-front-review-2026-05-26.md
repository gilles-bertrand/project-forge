---
title: Code Review — @libs/projects-front
tags: [review, projects-front, ember, warpd-drive]
created: 2026-05-26
updated: 2026-05-26
status: active
type: review
---

# Code Review — `@libs/projects-front`

**Date**: 2026-05-26
**Branch**: dev (post-merge d42d3d3, with `6ffdaa7` fix on top)
**Scope**: 15 source files in `src/`, 4 test files in `tests/`
**Reviewer**: code-reviewer agent (Claude Sonnet 4.6)

---

## Blockers

### B1 — Raw `fetch()` in `ProjectFormModal.loadUsers` — CLAUDE.md violation

**File**: `@libs/projects-front/src/components/project-form-modal.gts:115`

`loadUsers()` manually reads the JWT from `session.data.authenticated.data.accessToken` and passes it as a custom header. This is exactly the anti-pattern documented in CLAUDE.md ("Pas de `fetch()` brut vers `/api/v1`... utiliser `authFetch`"). It duplicates the session coupling that `authFetch` already handles, and will silently stop working if the token shape changes (it already has a defensive cast to `| { data?: { accessToken?: string } } | undefined`).

The fix is straightforward: replace with `authFetch('/api/v1/users')` and remove the `@service declare session` injection and manual token extraction entirely.

Additionally, the `store` service injection (`@service declare store: Store`) is declared but never used in this component — dead dependency.

### B2 — MSW mock missing `POST /members` and `DELETE /members/:id` handlers

**File**: `@libs/projects-front/src/http-mocks/projects.ts`

`ProjectsService.addMember` calls `POST /api/v1/projects/:id/members` and `removeMember` calls `DELETE /api/v1/projects/:id/members/:userId`. Neither endpoint is registered in `allProjectsHandlers`. Any integration test or dev-mode session that exercises the create-with-members or edit-members flow will hit an unhandled request, MSW will passthrough to the real network (or fail), and the operation will silently break. The mock covers GET members and GET stats but not the mutating member endpoints. **There are currently zero tests covering `addMember`/`removeMember` on the service level**, so this gap is entirely invisible in CI.

---

## Major

### M1 — `ProjectFormModal` constructor fires async work with no lifecycle cleanup

**File**: `@libs/projects-front/src/components/project-form-modal.gts:56–60`

The `else` branch calls `void this.loadUsers().finally(() => { this.membersLoaded = true; })`. If the modal is unmounted before the fetch resolves (e.g. the user closes it immediately), the callback still runs and writes to `this.membersLoaded`. In Glimmer, writing to `@tracked` on a destroyed owner throws a dev-mode warning and is a no-op in prod, but it is still incorrect. The same issue exists in `ProjectCard`'s constructor (both `loadMembers` and `loadStats`). These should guard with an `isDestroyed` check or use a task (e.g. `ember-concurrency`), which is the Octane-idiomatic pattern.

### M2 — `ProjectsTable.tableParams` getter not `@cached` — re-builds on every render

**File**: `@libs/projects-front/src/components/projects-table.gts:45`

`tableParams` is a plain getter that allocates a new object (including two `intl.t()` calls per column and action) on every access. Glimmer calls getters on every render pass. Since the table config never changes at runtime, this should be either `@cached` (if it needs reactivity) or computed once in the constructor and stored as a class field. The current form also means `intl.t()` runs eagerly at construction time, which is fine for locale, but the allocation overhead is unnecessary.

### M3 — `projects-schema-test` does not assert `sprintDurationDays` / `defaultVelocityPoints`

**File**: `@libs/projects-front/tests/unit/projects-schema-test.gts:9–25`

The unit test that guards the schema field list was not updated after the sprint config fields were added. The two fields added by commit `6ffdaa7` (`sprintDurationDays`, `defaultVelocityPoints`) are now in the schema but not asserted in the test. This means the test would still pass if those fields were accidentally removed again — the exact regression that occurred in the squash-merge of PR #28. The test should assert `expect(fieldNames).toContain('sprintDurationDays')` and `expect(fieldNames).toContain('defaultVelocityPoints')`.

### M4 — `project-action-bar-test` missing the 4th button (sprints)

**File**: `@libs/projects-front/tests/integration/project-action-bar-test.gts`

The test suite covers backlog, kanban, and user-story-map click handlers (3 tests) but has no test for the sprints button (`data-test-project-action-sprints`). The "renders 4 action buttons" assertion checks the button exists in the DOM, but there is no coverage verifying the sprints button calls `transitionTo('dashboard.sprints')`. Minor gap but inconsistent.

### M5 — `deleteConfirmQuestion` builds a UI string from two i18n keys concatenated with raw `\n\n`

**File**: `@libs/projects-front/src/templates/dashboard/projects.gts:108–113`

```ts
const prefix = this.deleteError ? `⚠ ${this.deleteError}\n\n` : '';
return `${prefix}${title}\n\n${body}`;
```

The `\n\n` separator is invisible in HTML (the modal renders the string in a context that strips whitespace), the `⚠` emoji is hardcoded (inconsistent with the `@icon=""` empty arg passed to `TpkConfirmModalPrefab`), and the resulting string conflates two translatable units with runtime glue. This should use a single i18n key with interpolation, or the modal component should accept separate `title`/`body` args. Also `deleteError` is set to an i18n string but then prepended raw — if the error message itself ever contains an `⚠`, it will double up.

---

## Minor

### m1 — `ProjectCard` mini-counter for user stories shows only `total`, not `done/total`

**File**: `@libs/projects-front/src/components/project-card.gts:254`

```hbs
<div class="text-sm font-bold">{{this.userStoriesTotal}}</div>
```

All other 3 counters show `done/total` (epics: `epicsDone/epicsTotal`, tasks: `tasksDone/tasksTotal`, sprints: `sprintsActive/sprintsTotal`). The user-stories counter in the 4-cell grid shows only total. This was flagged in observation #596 as "inconsistent". The progress bar above already shows `userStoriesDone/userStoriesTotal` — the mini-counter should mirror the same pattern (`{{this.userStoriesDone}}/{{this.userStoriesTotal}}`).

### m2 — `ProjectCard` fires two independent async operations in constructor with no coordination

**File**: `@libs/projects-front/src/components/project-card.gts:110–112`

`loadMembers()` and `loadStats()` are both `void`-fired from the constructor independently. There is no combined loading state — the card renders in three phases (initial render, after members resolve, after stats resolve) with no loading skeleton or spinner. This is not a bug, but means the card visually "jumps" as data loads. Consider a `@tracked loading = true` flag that gates both, or a loading skeleton.

### m3 — `project-form-modal` has hardcoded `"Resp."` badge text (not i18n)

**File**: `@libs/projects-front/src/components/project-form-modal.gts:368`

```hbs
<span class="badge badge-primary badge-xs ml-auto">Resp.</span>
```

This is the only non-translated user-visible string in the component. A French user sees "Resp." which is acceptable but it bypasses the i18n pipeline. Should be `{{t "projects.modal.responsibleBadge"}}`.

### m4 — `StatusBadge` uses DaisyUI class `badge-soft` which may not exist

**File**: `@libs/projects-front/src/components/status-badge.gts:11–17`

`badge-soft` is not a standard DaisyUI v3/v4 utility class — it appears to be a project-local or custom class. If it was intended to be `badge-outline` (DaisyUI standard) or a custom class defined in the design token layer, this should be documented. If it is genuinely undefined, the badges render without the soft variant styling silently.

### m5 — `CalendarIcon` in `project-card.gts` missing `aria-hidden="true"`

**File**: `@libs/projects-front/src/components/project-card.gts:17–31`

`PencilIcon` and `TrashIcon` both have `aria-hidden="true"`. `CalendarIcon` does not. The calendar icon is decorative (next to the text "Créé le <date>") and should also be hidden from AT. Minor a11y inconsistency.

---

## Nit

### n1 — `ProjectActionBar` TODO comment is stale post-fix

**File**: `@libs/projects-front/src/components/project-action-bar.gts:112–114`

The TODO(a11y) comment notes "ProjectActionBar lives inside a `role=button` card". Commit `6ffdaa7` fixed `ProjectCard` to use `role="article"` instead of `role="button"`. The TODO precondition no longer holds — the card is no longer a button. The comment should be removed or updated to reflect current state.

### n2 — `DashboardProjectsTemplate` uses `Component` without generic arg

**File**: `@libs/projects-front/src/templates/dashboard/projects.gts:73`

```ts
export default class DashboardProjectsTemplate extends Component {
```

Other components in the same lib use typed signatures (`Component<SomeSignature>`). An untyped `Component` base loses Glint template type checking for `@args`. Since this is a route template with no external args this is low risk, but inconsistent.

### n3 — `fakeProject()` fixtures in test files omit `sprintDurationDays`/`defaultVelocityPoints`

**File**: `tests/integration/project-form-modal-test.gts:51–65`, `tests/integration/project-action-bar-test.gts:11–24`

Both helper functions cast `as Project` but omit the two new fields added by the schema fix. TypeScript accepts this because `as Project` suppresses checks. If the `Project` type is ever made stricter, these will break silently. Non-blocking since tests pass, but worth aligning.

### n4 — `eslint-disable` comments at top of `http-mocks/projects.ts` suppress typing for the whole file

**File**: `@libs/projects-front/src/http-mocks/projects.ts:1–3`

Three blanket `eslint-disable` directives disable `@typescript-eslint/no-unsafe-member-access`, `no-unsafe-assignment`, and `no-explicit-any` for the entire file. These could be scoped to specific lines (the `json.data?.attributes` access) rather than the whole file.

---

## Summary Table

| ID | Severity | File | Topic |
|----|----------|------|-------|
| B1 | blocker | `project-form-modal.gts:115` | Raw `fetch()` — CLAUDE.md violation + dead `store` service |
| B2 | blocker | `http-mocks/projects.ts` | Missing POST/DELETE member MSW handlers |
| M1 | major | `project-form-modal.gts:56`, `project-card.gts:110` | Async in constructor without destroy guard |
| M2 | major | `projects-table.gts:45` | `tableParams` getter not `@cached` — allocates on every render |
| M3 | major | `projects-schema-test.gts:9` | Schema test missing sprint config field assertions |
| M4 | major | `project-action-bar-test.gts` | No test for sprints button click handler |
| M5 | major | `dashboard/projects.gts:108` | `deleteConfirmQuestion` string assembly bypasses i18n |
| m1 | minor | `project-card.gts:254` | User stories mini-counter shows only total, not done/total |
| m2 | minor | `project-card.gts:110` | No combined loading state for dual async constructor calls |
| m3 | minor | `project-form-modal.gts:368` | Hardcoded "Resp." badge — not translated |
| m4 | minor | `status-badge.gts:11` | `badge-soft` class non-standard DaisyUI |
| m5 | minor | `project-card.gts:17` | `CalendarIcon` missing `aria-hidden="true"` |
| n1 | nit | `project-action-bar.gts:112` | Stale TODO(a11y) comment |
| n2 | nit | `dashboard/projects.gts:73` | `Component` without generic signature |
| n3 | nit | test fixtures | `fakeProject()` omits sprint config fields, casts `as Project` |
| n4 | nit | `http-mocks/projects.ts:1` | Blanket eslint-disable instead of line-level |

---

## Verdict

REQUEST CHANGES — 2 blockers to fix before shipping: raw `fetch()` in form modal (CLAUDE.md violation) and missing MSW handlers for member mutations. The schema test gap (M3) is the most likely to cause a future regression and should be addressed in the same pass as the schema fix already in `6ffdaa7`.
