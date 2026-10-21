# ReportHub Fill Plan

## 1. What ReportHub does

ReportHub is a civic infrastructure reporting application. Citizens register
and sign in, submit reports (category, description, location, optional photo),
receive a reference such as `RH-ABC123`, and track status. Administrators get a
dashboard, a report table and details view, a Leaflet map, analytics,
heuristic "AI" insights, departments, users, notifications, and settings.

The client is React 19 + Vite + React Router + Bootstrap/Bootstrap Icons +
Leaflet/React-Leaflet + Recharts. At runtime the frontend calls a PHP/MySQL API
under `api/`. A separate Express/PostgreSQL server exists but is not used by the
frontend.

## 2. Verified empty-file inventory

`empty-files.txt` was not present in the repository. The list was verified
directly with:

```bash
find . -type f -empty -not -path "./node_modules/*" -not -path "./.git/*" \
  -not -path "./dist/*" -not -path "./build/*" | sort
```

Result: 13 files.

- `src/components/admin/AIInsightCard.tsx`
- `src/components/admin/PriorityBadge.tsx`
- `src/components/admin/ReportTable.tsx`
- `src/components/admin/StatCard.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/hooks/admin/useAdmin.ts`
- `src/services/admin/adminService.ts`
- `src/services/admin/aiAnalyzerService.ts`
- `src/services/admin/reportAdminService.ts`
- `src/services/admin/userAdminService.ts`
- `src/types/admin/user.ts`
- `src/utils/admin/formatters.ts`
- `src/utils/admin/permissions.ts`

## 3. Git history

All 13 paths have only ever existed as 0-byte files. There is no earlier
implementation to restore.

| Commit | Event |
|---|---|
| `3bbf161` | "Build administration portal foundation" — all 13 created empty |
| `6b6b07d` | "baseline checkpoint" — re-added empty |
| `b24b064` | turn 40 — deleted |
| `cf7104b` | turn 5 start — re-added empty (current) |

Verified with `git cat-file -s` for every commit touching each path: the only
size ever recorded is `0`. `git fsck --no-reflogs --unreachable` shows no
dangling commits for these modules; the unreachable blobs belong to older
monolithic `App.jsx` versions.

## 4. Conventions discovered

This section is the source for the proposed `AGENTS.md` in Batch 8.

- **Frontend style:** 2-space indentation, single quotes, no semicolons,
  trailing commas. Functions use `function name()` declarations. `import type`
  is used for type-only imports. Existing files use section-banner comments.
- **Components:** one default-exported PascalCase component per file. Admin
  components live in `src/components/admin`; pages in `src/pages` and
  `src/pages/admin`.
- **Services:** named `*Service.ts`, camelCase exported functions. The existing
  convention is thin wrappers over `src/services/apiClient.ts`.
- **Hooks:** named `use*.ts`, one hook per file, under `src/hooks/<domain>`.
- **Types:** `src/types/report.ts` is the canonical report shape
  (`Under Review | In Progress | Resolved`, `Critical | High | Medium | Low`).
  `src/types/admin/*` mirrors admin-facing shapes.
- **Styling:** admin screens use Bootstrap 5 utility classes plus
  Bootstrap Icons. Public pages use the custom CSS in `src/index.css`.
- **API client:** `src/services/apiClient.ts` hardcodes
  `https://reporthub.ifree.page/api`, sends `Authorization: Bearer
  <reporthub_token>` from `localStorage`, unwraps `{ data }`, and throws
  `{ error }` messages.
- **Auth:** `users.role` is `citizen | admin`. PHP issues tokens shaped
  `reporthub-{id}-{hex}`; `authenticated_user(true)` enforces admin-only
  endpoints. The frontend stores `reporthub_user` and `reporthub_token`.
- **Databases:** `api/*.php` uses PDO/MySQL. `database/schema.sql` is
  PostgreSQL. `server/index.js` is Express/`pg`.
- **Build:** `npm run dev`, `npm run build`. There is no test script, no
  type-check script, and no working lint setup (TypeScript/ESLint packages are
  not installed).
- **Environment:** `VITE_API_URL` is declared in `.env.example` but unused.
  `server/index.js` uses `PORT` and `DATABASE_URL`. PHP uses
  `REPORT_HUB_DB_HOST`, `REPORT_HUB_DB_PORT`, `REPORT_HUB_DB_NAME`,
  `REPORT_HUB_DB_USER`, `REPORT_HUB_DB_PASSWORD`, and
  `REPORT_HUB_CORS_ORIGINS`.

## 5. Backend divergence

**`api/*.php` (PHP/MySQL) is canonical at runtime.** `server/index.js` and
`database/schema.sql` must not be modified.

| Area | `api/*.php` (canonical) | `server/index.js` (legacy) | `database/schema.sql` |
|---|---|---|---|
| Language/DB | PHP 8 + PDO MySQL | Express 5 + `pg` | PostgreSQL |
| Endpoints | `health`, `auth`, `users`, `reports` | `/api/health`, `GET/POST /api/reports` | n/a |
| Report fields | `reference`, `user_id`, `category`, `description`, `location`, `latitude`, `longitude`, `status`, `priority`, `evidence_name`, `department`, `assigned_to`, `administrative_note` | `title`, `evidence_name`, `evidence_data`; no priority/assignment fields | lacks `latitude`, `longitude`, `priority`, `department`, `assigned_to`, `administrative_note` |
| Status values | `Under Review`, `In Progress`, `Resolved` | `Received`, `In progress`, `Resolved` | `Received`, `In progress`, `Resolved` |
| Auth | Bearer `reporthub-{id}-{hex}`; admin via `authenticated_user(true)` | none | `role IN ('citizen','admin')` |
| Used by frontend | yes, via `apiClient.ts` | no | indirectly (README only) |

Consequences:

- Admin services must wrap `apiClient.ts` and the PHP endpoints. No new backend
  is created.
- Status normalization is mandatory because four vocabularies exist:
  `src/types/report.ts` (title case), `src/types/admin/report.ts` (lowercase
  hyphenated), `api/reports.php` (title case), and `schema.sql`
  (`Received`/`In progress`).
- The PHP `format_report()` reads columns that `schema.sql` does not define.
  This is an existing runtime divergence and is out of scope here.
- `node_modules` contains incomplete/empty directories for several declared
  packages. Exact versions for Batch 8 were recovered from
  `6b6b07d:package-lock.json`, which matches the last committed install.

## 6. File table

| File | Layer | Purpose (inferred) | Depends on | Used by | Batch |
|---|---|---|---|---|---|
| `src/types/admin/user.ts` | Types | Extend and re-export `AdminUser` from `types/admin/admin.ts`; add the runtime-derived `AdminUserRole = 'citizen' \| 'admin'` and list/collection helpers | `types/admin/admin.ts` | `userAdminService`, `useAdmin`, `AdminUsers` | 1 |
| `src/utils/admin/formatters.ts` | Utils | Date/status/priority/label formatting plus normalization helpers that map every observed vocabulary to the display set | `types/report.ts`, `types/admin/report.ts` | Badge/table components, services, admin pages | 1 |
| `src/utils/admin/permissions.ts` | Utils | UI-only role/permission checks (with a comment that the server must enforce authorization) | `types/admin/admin.ts`, `services/auth.ts` | `useAdmin`, admin layout/navigation (new code only) | 1 |
| `src/services/admin/reportAdminService.ts` | Service (client-side) | Report list, filter, detail, status/priority update via `apiClient` | `services/apiClient.ts`, `types/report.ts`, `types/admin/report.ts`, `formatters` | `adminService`, `useAdmin` | 3 |
| `src/services/admin/userAdminService.ts` | Service (client-side) | Read-only user listing via `GET /users.php` | `services/apiClient.ts`, `types/admin/user.ts` | `adminService`, `useAdmin` | 3 |
| `src/services/admin/aiAnalyzerService.ts` | Service (client-side) | Extract the deterministic heuristic currently inline in `AdminAIAnalyzer` (critical/priority, location concentration, category patterns, confidence); no external LLM | `types/report.ts`, `types/admin/ai.ts`, `reportAdminService`, `formatters` | `adminService`, `useAdmin` | 3 |
| `src/services/admin/adminService.ts` | Service (client-side) | Dashboard/analytics aggregates only; no auth or session facade | report/user/AI services, types | `useAdmin` | 3 |
| `src/hooks/admin/useAdmin.ts` | Hook | Admin data/loading/error/refresh state for new code only | `services/admin/*` | New admin code (existing pages are not refactored) | 6 |
| `src/components/admin/StatusBadge.tsx` | Component | Additive status badge component | `types/report.ts`, `formatters` | New admin code | 7 |
| `src/components/admin/PriorityBadge.tsx` | Component | Additive priority badge component | `types/report.ts`, `formatters` | New admin code | 7 |
| `src/components/admin/StatCard.tsx` | Component | Additive metric card | `formatters` | New admin code | 7 |
| `src/components/admin/ReportTable.tsx` | Component | Additive report table with filters/actions | `Report`, `StatusBadge`, `PriorityBadge`, `formatters`, permissions | New admin code | 7 |
| `src/components/admin/AIInsightCard.tsx` | Component | Additive AI insight card (level, confidence, evidence, report links) | `types/admin/ai.ts`, `formatters` | New admin code | 7 |

## 7. Batches

### Batch 1 — Types, utils, config

1. `src/types/admin/user.ts`
   - Re-export `AdminUser` (and `AdminRole`) from `types/admin/admin.ts`.
   - Add `AdminUserRole = 'citizen' | 'admin'` (runtime-derived) and
     `AdminUserCollection = AdminUser[]`.
   - Do not edit `types/admin/admin.ts`.
2. `src/utils/admin/formatters.ts`
   - Existing display set: `Under Review | In Progress | Resolved` and
     `Critical | High | Medium | Low`.
   - Normalize all observed inputs:
     - status: `Received` → `Under Review`; `In progress` → `In Progress`;
       `submitted` → `Under Review`; `under-review` → `Under Review`;
       `in-progress` → `In Progress`; `resolved` → `Resolved`.
     - priority: lowercase variants → title case.
   - Provide date formatting and Bootstrap badge-class helpers.
   - Do not change `src/types/report.ts` or `src/types/admin/report.ts`.
3. `src/utils/admin/permissions.ts`
   - UI gating only, based on the `citizen | admin` runtime role.
   - Include a comment that the server must enforce authorization.

### Batch 2 — Database schema/models/repositories

No empty files. `database/schema.sql` and `server/index.js` remain untouched.

### Batch 3 — Service layer (client-side)

Implement the four files in this order:

1. `reportAdminService.ts` (wraps `getReportsFromApi`, `getReportFromApi`,
   `updateReportFromApi`).
2. `userAdminService.ts` (read-only `getUsersFromApi`).
3. `aiAnalyzerService.ts` (pure functions extracted from
   `AdminAIAnalyzer.tsx`; no network/LLM calls).
4. `adminService.ts` (dashboard/analytics aggregates composed from the
   services above).

All services use `apiClient.ts`; no Express/TypeScript backend is added.

### Batch 4 — Controllers, middleware, validators

No empty files. No new backend modules.

### Batch 5 — Routes and entry-point mounting

No empty files. Do not modify `server/index.js` or `api/*.php`.

### Batch 6 — Hooks

Implement `src/hooks/admin/useAdmin.ts` for new code only. Existing pages keep
their inline `useEffect`/`useState` data loading. No page refactors.

### Batch 7 — Components

Implement the five components as additive modules. Mirror the props of the
current inline implementations where they exist:

- `StatCard`: `label`, `value`, `description`, `icon`, `iconClass`, optional
  `href`.
- `StatusBadge`: normalized status.
- `PriorityBadge`: normalized priority.
- `ReportTable`: report rows, filters, and row actions.
- `AIInsightCard`: insight level, title, location, explanation, evidence,
  confidence, report references.

Do not replace the inline components in `AdminDashboard`, `AdminReports`,
`AdminAnalytics`, `AdminAIAnalyzer`, `AdminReportDetails`, or `AdminMap`.

### Batch 8 — Project metadata

1. `package.json`: declare the missing imported dependencies without running
   `npm install`:
   - dependencies: `bootstrap@5.3.8`, `bootstrap-icons@1.13.1`,
     `leaflet@1.9.4`, `react-leaflet@5.0.0`, `react-router-dom@7.18.2`,
     `recharts@3.10.1`
   - devDependencies: `@types/leaflet@1.9.22`
   - `echarts`/`echarts-for-react` are installed but not imported anywhere;
     leave them out.
   - Exact versions come from `6b6b07d:package-lock.json` because current
     `node_modules` entries are incomplete and expose no `package.json`.
2. Create `AGENTS.md` from section 4 of this plan.

## 8. Open items

1. **AdminRole mismatch.** Runtime roles are `citizen | admin`, but
   `types/admin/admin.ts` declares `admin | authority | moderator`. Since
   `admin.ts` stays canonical, Batch 1 will expose `AdminUserRole =
   'citizen' | 'admin'` from `user.ts`. Should `AdminRole` later be narrowed in
   `admin.ts`, or are `authority`/`moderator` planned roles?
2. **AI extraction boundary.** Should `aiAnalyzerService` include only insight
   generation and scoring, or also the summary statistics and signal rows that
   currently live in `AdminAIAnalyzer`? Recommendation: insights + scoring only.
3. **`adminService` surface.** Confirm it should expose both dashboard KPIs and
   analytics breakdowns (status/category/priority counts, resolution rate), or
   dashboard only.
4. **Normalization target.** Confirm the display set is exactly
   `src/types/report.ts` title-case values, and that normalization lives in
   `formatters.ts` rather than the types.
5. **Component props.** Confirm additive components should copy the current
   inline prop shapes rather than introduce new APIs.
6. **Batch 8 versions.** Confirm pinning the exact versions from
   `6b6b07d:package-lock.json` is acceptable, given the current empty
   `node_modules` directories.
7. **Type-check/lint.** `typescript`, `@types/react`, `@types/react-dom`, and
   the ESLint packages are absent from `node_modules`, so no verification
   command can run until they are installed in a future batch.

## 9. Constraints

- Only the 13 listed empty files are implemented, plus `package.json` and
  `AGENTS.md` in Batch 8.
- Do not modify `server/index.js`, `database/schema.sql`, or `api/*.php`.
- Do not modify existing non-empty frontend files to use the new code.
- Do not run `npm install`.
- `api/*.php` (PHP/MySQL) is the canonical runtime backend.
