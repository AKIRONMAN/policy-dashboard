# AI Sessions

**Session goal:** Scaffold the mock backend — data generator, db.json, and the Node.js server stub.

---

## Prompt 1

> I need a Node.js script that generates a `db.json` file with 210 APAC insurance policies. Each policy needs: id, policyNumber, policyholderName, lineOfBusiness, status, premiumAmount, currency, effectiveDate, expiryDate, region, underwriter, and flaggedForReview. The status distribution should be weighted — roughly half active, some pending, some expired, a few cancelled. Regions should be APAC only (Japan, Singapore, Australia, Hong Kong, South Korea, Thailand) with region-appropriate currencies. About 20% should be flagged. Use only Node.js built-ins, no external packages.

**Generated:** `scripts/generate-db.js`

Key decisions in the output:
- Weighted status pool built as an explicit array (`['ACTIVE','ACTIVE','ACTIVE','PENDING',...]`) — simple to read and tweak without touching probability math
- `region → currency` map hardcoded (`{ Japan: 'JPY', Singapore: 'SGD', Australia: 'AUD', ... }`) — deterministic, no randomisation needed for currency
- effectiveDate set 1–2 years in the past; expiryDate 6 months to 2 years ahead relative to effectiveDate — produces a realistic mix of in-force, expiring-soon, and expired policies
- `flaggedForReview` set by `Math.random() < 0.2` — independent of status

```js
// Abbreviated output
const STATUS_POOL = [
  'ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE',
  'PENDING','PENDING','PENDING','PENDING',
  'EXPIRED','EXPIRED','EXPIRED','EXPIRED',
  'CANCELLED','CANCELLED',
];
const REGION_CURRENCY = {
  Japan: 'JPY', Singapore: 'SGD', Australia: 'AUD',
  'Hong Kong': 'HKD', 'South Korea': 'KRW', Thailand: 'THB',
};
```

---

## Prompt 2

> Good. Now create `policies.js` — a custom HTTP server using only Node's `http`, `fs`, and `url` built-ins. It should read `db.json` on every request (no caching for now), add a 500ms delay to all responses, and set CORS headers so the Angular dev proxy doesn't block. Register three routes: GET /policies, GET /policies/summary, and PATCH /policies/bulk-flag. The route handlers can be stubs that just return empty JSON for now — I'll fill in the logic in the next commit. Also add `mock:api` and `generate:data` scripts to package.json.

**Generated:** `policies.js` (stub handlers), `package.json` (scripts)

Key decisions in the output:
- Server reads `db.json` synchronously inside each handler after the 500ms delay — avoids stale in-memory state between requests without adding a file-watcher
- `Content-Type: application/json` and CORS headers set once in a shared `sendJson(res, statusCode, body)` helper — every handler calls it rather than setting headers inline
- Route dispatch is a plain `if/else if` chain — no router library, predictable execution order
- `PATCH /policies/bulk-flag` reads the full request body via a `readBody(req)` Promise helper before dispatching

```js
// Abbreviated structure
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  setTimeout(() => {
    const { pathname } = url.parse(req.url, true);
    if (req.method === 'GET' && pathname === '/policies') return handleList(req, res);
    if (req.method === 'GET' && pathname === '/policies/summary') return handleSummary(req, res);
    if (req.method === 'PATCH' && pathname === '/policies/bulk-flag') return handleBulkFlag(req, res);
    sendJson(res, 404, { error: 'Not found' });
  }, 500);
}).listen(PORT);
```

---

## Prompt 3

> The generate script works. Run it and confirm `db.json` has 210 records, then add both files to the project. Also make sure the route for OPTIONS preflight returns 200 so the proxy doesn't break during Angular development.

**Generated:** db.json (210 records via script run), updated `policies.js` preflight handler

Added OPTIONS handler before the main route dispatch:

```js
if (req.method === 'OPTIONS') {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  return res.end();
}
```

**Session goal:** Implement the full filter/sort/summary/bulk-flag logic in `policies.js` and wire up the Angular proxy.

---

## Prompt 4

> Fill in the three route handlers in `policies.js`. For GET /policies I need: filtering by search (case-insensitive substring across policyNumber, policyholderName, underwriter), multi-value status/lineOfBusiness/region as comma-separated query params, flagged as a boolean string, and date range filters for effectiveDate and expiryDate. Then apply sorting (ASC/DESC, handle both string and numeric fields), then paginate. Return `{ data, pagination }`. For GET /policies/summary apply the same filters but return aggregate counts — total, by status, flagged count, total premium, premium by LOB, and how many expire within 30 days. Do not modify db.json for these two routes.

**Generated:** `applyFilters`, `applySorting`, `computeSummary` functions in `policies.js`

Design decisions surfaced during generation:

**Multi-value params:** comma-split on the server, checked with `.includes()` — avoids repeated `?status=A&status=B` in URLs and keeps Angular's `HttpParams` simple:
```js
function applyFilters(policies, q) {
  let result = policies;
  if (q.status) {
    const statuses = q.status.split(',');
    result = result.filter(p => statuses.includes(p.status));
  }
  if (q.search) {
    const term = q.search.toLowerCase();
    result = result.filter(p =>
      p.policyNumber.toLowerCase().includes(term) ||
      p.policyholderName.toLowerCase().includes(term) ||
      p.underwriter.toLowerCase().includes(term)
    );
  }
  if (q.flagged !== undefined) {
    const flag = q.flagged === 'true';
    result = result.filter(p => p.flaggedForReview === flag);
  }
  // date range checks using ISO string comparison ...
  return result;
}
```

**Sorting — null-safe, type-aware:**
```js
function applySorting(policies, sortField, sortOrder) {
  if (!sortField) return policies;
  const dir = sortOrder === 'DESC' ? -1 : 1;
  const NUMERIC_FIELDS = ['premiumAmount'];
  return [...policies].sort((a, b) => {
    const av = a[sortField], bv = b[sortField];
    if (av == null) return 1;
    if (bv == null) return -1;
    return NUMERIC_FIELDS.includes(sortField)
      ? (av - bv) * dir
      : String(av).localeCompare(String(bv)) * dir;
  });
}
```

**Summary — expiringSoon uses a 30-day window from server time:**
```js
function computeSummary(policies) {
  const now = new Date();
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
  return {
    totalPolicies: policies.length,
    activePolicies: policies.filter(p => p.status === 'ACTIVE').length,
    pendingPolicies: policies.filter(p => p.status === 'PENDING').length,
    expiredPolicies: policies.filter(p => p.status === 'EXPIRED').length,
    cancelledPolicies: policies.filter(p => p.status === 'CANCELLED').length,
    flaggedForReview: policies.filter(p => p.flaggedForReview).length,
    expiringSoonPolicies: policies.filter(p => {
      const d = new Date(p.expiryDate);
      return d >= now && d <= in30;
    }).length,
    totalPremium: policies.reduce((sum, p) => sum + p.premiumAmount, 0),
    lobPremiumMap: policies.reduce((map, p) => {
      map[p.lineOfBusiness] = (map[p.lineOfBusiness] || 0) + p.premiumAmount;
      return map;
    }, {}),
    currency: 'USD',
  };
}
```

---

## Prompt 5

> For PATCH /policies/bulk-flag: accept `{ policyIds: string[], flagged: boolean }` in the body. Read db.json, update matching records, write back atomically, respond with `{ success: true, updatedCount: N }`. If policyIds is empty or missing respond with `{ success: true, updatedCount: 0 }` and skip the write.

**Generated:** `handleBulkFlag` function

```js
async function handleBulkFlag(res, body) {
  const { policyIds = [], flagged } = body;
  if (!policyIds.length) return sendJson(res, 200, { success: true, updatedCount: 0 });

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const idSet = new Set(policyIds);
  let count = 0;
  db.policies = db.policies.map(p => {
    if (idSet.has(p.id)) { count++; return { ...p, flaggedForReview: flagged }; }
    return p;
  });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  sendJson(res, 200, { success: true, updatedCount: count });
}
```

---

## Prompt 6

> Now add `proxy.conf.json` so Angular forwards `/policies` to `localhost:3000`, and update `angular.json` serve config to use it. Keep the proxy file minimal — just the one path prefix, no extra options beyond `target`, `secure: false`, and `changeOrigin: true`.

**Generated:** `proxy.conf.json`, `angular.json` (serve options updated)

```json
{
  "/policies": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

`angular.json` change — inside the `serve` builder `options` block:
```json
"proxyConfig": "proxy.conf.json"
```

---

## Prompt 7

> I'm building an Angular 19 insurance policy dashboard that talks to a Node.js mock API. Before I touch components I need the full domain model and state layer. Start with all the TypeScript interfaces and enums:
>
> - `PolicyStatus` enum: ACTIVE, PENDING, EXPIRED, CANCELLED
> - `LineOfBusiness` enum: PROPERTY, CASUALTY, MARINE, A&H
> - `SortDirection` enum: Asc, Desc
> - `PolicySortField` enum for every sortable column
> - `Region` and `Currency` enums for APAC
> - `Policy` interface with all fields: id, policyNumber, policyholderName, lineOfBusiness, status, premiumAmount, currency, effectiveDate (ISO date string), expiryDate, region, underwriter, flaggedForReview
> - `PolicyFilters` interface for all filter fields with a `DEFAULT_POLICY_FILTERS` constant
> - `Pagination` interface (page, pageSize, total, totalPages) with a default
> - `Sort` interface — make `field` nullable (`PolicySortField | null`) so initial load sends no sort params and no column shows a sort indicator by default
> - `PolicySummary` interface for the summary panel: total, by-status counts, flaggedForReview, expiringSoonPolicies, totalPremium, lobPremiumMap
> - `PolicyState` for NgRx: holds policies, filters, pagination, sort, selectedPolicyIds, loadStatus, error, and `summaryStats` as a first-class state field (populated by a dedicated API call — not computed from the paginated policies array, which would give wrong totals on page 2+)
> - A barrel `index.ts` exporting everything
>
> Use strict readonly types throughout. Put enums in `policy.enums.ts`, the Policy interface in `policy.model.ts`, and everything else in its own file.

**Generated:** `policy.enums.ts`, `policy.model.ts`, `policy-filters.model.ts`, `pagination.model.ts`, `sort.model.ts`, `policy-summary.model.ts`, `policy-state.model.ts`, `shared/models/index.ts`

Key model shapes:

```typescript
// policy.enums.ts
export enum PolicyStatus { Active = 'ACTIVE', Pending = 'PENDING', Expired = 'EXPIRED', Cancelled = 'CANCELLED' }
export enum PolicySortField { PolicyNumber = 'policyNumber', PremiumAmount = 'premiumAmount', EffectiveDate = 'effectiveDate', ExpiryDate = 'expiryDate', /* ... */ }
export enum SortDirection { Asc = 'asc', Desc = 'desc' }
```

```typescript
// policy.model.ts
export type IsoDateString = string;
export interface Policy {
  readonly id: string;
  readonly policyNumber: string;
  readonly policyholderName: string;
  readonly lineOfBusiness: LineOfBusiness;
  readonly status: PolicyStatus;
  readonly premiumAmount: number;
  readonly currency: Currency;
  readonly effectiveDate: IsoDateString;
  readonly expiryDate: IsoDateString;
  readonly region: Region;
  readonly underwriter: string;
  readonly flaggedForReview: boolean;
}
```

```typescript
// sort.model.ts — nullable field = no default sort on load
export interface Sort {
  readonly field: PolicySortField | null;
  readonly direction: SortDirection;
}
export const DEFAULT_SORT: Sort = { field: null, direction: SortDirection.Asc };
```

```typescript
// policy-state.model.ts
export type PolicyLoadStatus = 'idle' | 'loading' | 'success' | 'error';
export interface PolicyState {
  readonly policies: readonly Policy[];
  readonly filters: PolicyFilters;
  readonly pagination: Pagination;
  readonly sort: Sort;
  readonly selectedPolicyIds: readonly string[];
  readonly loadStatus: PolicyLoadStatus;
  readonly error: string | null;
  readonly summaryStats: PolicySummary;
}
export const initialPolicyState: PolicyState = {
  policies: [],
  filters: DEFAULT_POLICY_FILTERS,
  pagination: DEFAULT_PAGINATION,
  sort: DEFAULT_SORT,
  selectedPolicyIds: [],
  loadStatus: 'idle',
  error: null,
  summaryStats: DEFAULT_POLICY_SUMMARY,
};
```

---

## Prompt 8

> Now build the complete NgRx slice and the HTTP service layer. I need:
>
> **Actions** — three groups:
> 1. Policy list: `loadPolicies` (carries filters + pagination + sort), `loadPoliciesSuccess`, `loadPoliciesFailure`
> 2. Summary: `loadSummary` (carries filters only — no pagination), `loadSummarySuccess`, `loadSummaryFailure`. These are separate because the summary endpoint runs against the whole filtered dataset, not a single page.
> 3. UI state: `updateFilters`, `updatePagination`, `updateSort`, `updateSelection`, `updateBulkFlag`, `clearSelection`
>
> **Reducer** using `createFeature` with `createReducer` — handle all actions with pure state transitions. `updateFilters` and `updateSort` should reset pagination to page 1. `updateBulkFlag` should optimistically update `flaggedForReview` on matching IDs in the current page. `clearSelection` sets `selectedPolicyIds` to `[]`.
>
> **Selectors** — let `createFeature` auto-generate the base selectors from state field names. Add `selectLoading` (boolean from loadStatus) and `selectPoliciesByIds` (filters by selectedPolicyIds) as derived selectors.
>
> **Effects** — three effects:
> - `loadPolicies$`: calls `ApiService.getPolicies`, on success dispatches `loadPoliciesSuccess` AND `loadSummary` together
> - `loadSummary$`: calls `ApiService.getSummary`, dispatches `loadSummarySuccess`
> - `flagPolicies$`: calls `ApiService.bulkFlag`, on success dispatches `clearSelection` then `loadPolicies`
>
> **ApiService** — thin HTTP adapter, no filtering logic. Three methods: `getPolicies`, `getSummary`, `bulkFlag`. Only add `sortField`/`sortOrder` params when `sort.field` is non-null.

**Generated:** `policy.actions.ts`, `policy.reducer.ts`, `policy.effects.ts`, `policy.selectors.ts`, `api.service.ts`

```typescript
// policy.actions.ts
export const loadPolicies = createAction('[Policy] Load Policies',
  props<{ filters: PolicyFilters; pagination: Pagination; sort: Sort }>());
export const loadSummary = createAction('[Policy] Load Summary',
  props<{ filters: PolicyFilters }>());
export const updateBulkFlag = createAction('[Policy] Update Bulk Flag',
  props<{ policyIds: readonly string[]; flagged: boolean }>());
export const clearSelection = createAction('[Policy] Clear Selection');
```

```typescript
// policy.reducer.ts
export const policyFeature = createFeature({
  name: 'policy',
  reducer: createReducer(
    initialPolicyState,
    on(loadPolicies, state => ({ ...state, loadStatus: 'loading' as const, error: null })),
    on(loadPoliciesSuccess, (state, { policies, pagination }) =>
      ({ ...state, policies, pagination, loadStatus: 'success' as const })),
    on(loadSummarySuccess, (state, { summary }) => ({ ...state, summaryStats: summary })),
    on(updateFilters, (state, { filters }) =>
      ({ ...state, filters, pagination: { ...state.pagination, page: 1 } })),
    on(updateBulkFlag, (state, { policyIds, flagged }) => ({
      ...state,
      policies: state.policies.map(p =>
        policyIds.includes(p.id) ? { ...p, flaggedForReview: flagged } : p),
    })),
    on(clearSelection, state => ({ ...state, selectedPolicyIds: [] })),
  ),
});
```

```typescript
// policy.selectors.ts
export const {
  selectPolicies, selectFilters, selectPagination, selectSort,
  selectSelectedPolicyIds, selectLoadStatus, selectError, selectSummaryStats,
} = policyFeature;

export const selectLoading = createSelector(selectLoadStatus, s => s === 'loading');
```

```typescript
// api.service.ts — sort guard in buildParams
private buildParams(filters: PolicyFilters, pagination?: Pagination, sort?: Sort): HttpParams {
  let p = new HttpParams();
  if (filters.statuses?.length) p = p.set('status', filters.statuses.join(','));
  if (pagination) p = p.set('page', pagination.page).set('limit', pagination.pageSize);
  if (sort?.field) {
    p = p.set('sortField', sort.field).set('sortOrder', sort.direction.toUpperCase());
  }
  return p;
}
```

---

## Prompt 9

> Last piece: `QueryParamsService` that syncs the store state to the browser URL so filters, pagination, and sort are shareable via link. When sort.field is null don't write sortBy at all. Skip params that are at their default value so a fresh visit has a clean URL.

**Generated:** `query-params.service.ts`

```typescript
serializeToQueryParams(filters: PolicyFilters, pagination: Pagination, sort: Sort): Params {
  const params: Record<string, string> = {};
  if (filters.search)           params['search'] = filters.search;
  if (filters.statuses?.length) params['status'] = filters.statuses.join(',');
  if (pagination.page > 1)      params['page'] = String(pagination.page);
  if (sort.field) {
    params['sortBy'] = sort.field;
    params['sortDir'] = sort.direction;
  }
  return params;
}
```

---

## Prompt 10

> Build `PolicyTableComponent` as a pure presentational component. It takes policies, loading, pagination, and sort as inputs and emits pageChange, sortChange, and selectionChange. Use PrimeNG `p-table` in lazy mode — the table should not filter or sort data itself, just emit events. 12 columns: checkbox, policy number, policyholder, LOB, status (icon-based, not text badge), premium, currency, effective date, expiry date, region, underwriter, flagged. OnPush change detection. Add a `trackByPolicyId` function. Status should be an icon only — check-circle for ACTIVE, clock for PENDING, times-circle for EXPIRED, ban for CANCELLED — with the colour from CSS classes.

**Generated:** `policy-table.component.ts`, `policy-table.component.html`, `policy-table.events.ts`

**Why icon-only status column:** 12 columns in a single viewport is tight. A text badge for status costs ~80px per row; an icon costs ~20px. The colour communicates the state instantly once users recognise the convention, and the column can be narrower without truncation.

**`PolicyTableSortChangeEvent` typed with non-nullable field:**
```typescript
// policy-table.events.ts
export interface PolicyTableSortChangeEvent {
  readonly field: PolicySortField;   // non-nullable — user click always provides a field
  readonly direction: SortDirection;
}
```
This is intentionally different from `Sort` (which allows `null` for the default no-sort state). A sort-click event without a field makes no sense — the user clicked a specific column header.

**Sort sync via `effect()`:**
```typescript
protected sortField = signal<string | null>(DEFAULT_SORT.field);
protected sortOrder = signal<number>(1);

constructor() {
  effect(() => {
    const s = this.sort();
    this.sortField.set(s.field);
    this.sortOrder.set(s.direction === SortDirection.Asc ? 1 : -1);
  });
}
```

**Status icon helper:**
```typescript
protected getStatusIcon(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'pi-check-circle status-active',
    PENDING: 'pi-clock status-pending',
    EXPIRED: 'pi-times-circle status-expired',
    CANCELLED: 'pi-ban status-cancelled',
  };
  return map[status] || 'pi-question-circle';
}
```

---

## Prompt 11

> Now build the other three components: `SummaryPanelComponent` (6 metric cards: total, active, pending, expired, total premium, flagged — each with a skeleton placeholder when loading), `FilterPanelComponent` (multi-select for status/LOB/region, text input for underwriter, date range for effective and expiry dates, clear-all button), and `BulkActionsComponent` (flag and unflag buttons, disabled when nothing selected, success toast via PrimeNG MessageService, clears selection after action). All OnPush.

**Generated:** `summary-panel.component.*`, `filter-panel.component.*`, `bulk-actions.component.ts`

**SummaryPanelComponent — skeleton slots when loading:**
```html
@if (loading()) {
  <p-skeleton height="2rem" styleClass="mb-2" />
} @else {
  <p class="summary-panel__value">{{ summary().activePolicies }}</p>
}
```

**BulkActionsComponent — `pairwise` pattern to detect flag completion:**
```typescript
this.store.select(selectLoadStatus).pipe(
  pairwise(),
  filter(([prev, curr]) => prev === 'loading' && curr === 'success'),
  takeUntilDestroyed(),
).subscribe(() => {
  this.messageService.add({
    severity: 'success',
    summary: 'Done',
    detail: `${this.selectedCount()} policies updated`,
  });
});
```

---

## Prompt 12

> Wire `DashboardContainerComponent` to the store. Use `selectSignal` for all store slices and pass them as inputs to child components. Child events should dispatch the right actions. Also initialise URL query param sync in `ngOnInit` — read params from the URL, dispatch them as initial filter/sort/pagination state, then trigger the first load.

**Generated:** `dashboard-container.component.ts` (full implementation)

Container pattern — all selectors as signals, passed as inputs:
```typescript
protected readonly policies = this.store.selectSignal(selectPolicies);
protected readonly loading = this.store.selectSignal(selectLoading);
protected readonly pagination = this.store.selectSignal(selectPagination);
protected readonly sort = this.store.selectSignal(selectSort);
protected readonly summaryStats = this.store.selectSignal(selectSummaryStats);
```

Event handlers dispatch and trigger reload:
```typescript
protected onFiltersChange(filters: PolicyFilters): void {
  this.store.dispatch(updateFilters({ filters }));
  this.store.dispatch(loadPolicies({ filters, pagination: DEFAULT_PAGINATION, sort: this.sort() }));
}

protected onSortChange(event: PolicyTableSortChangeEvent): void {
  const sort: Sort = { field: event.field, direction: event.direction };
  this.store.dispatch(updateSort({ sort }));
  this.store.dispatch(loadPolicies({ filters: this.filters(), pagination: DEFAULT_PAGINATION, sort }));
}
```
---

## Prompt 13

> The table currently shows nothing during load and then suddenly renders 25 rows — the page jumps. I want skeleton rows instead: when loading, render 10 placeholder rows that match the real column layout (checkbox, 10 data cells, flag cell). Don't use PrimeNG's built-in `[loading]` property — it replaces the body with a single `loadingbody` template and I want the column structure preserved. Keep the real data rows untouched for when loading is false.

**Generated:** Updated `policy-table.component.ts` and `policy-table.component.html`

**Approach — `[value]` swap:**
Instead of a loading template, pass an array of empty objects as the table value during load. The body template branches on `@if (loading())`:

```typescript
// component.ts
protected readonly skeletonRows = Array.from({ length: 10 });
```

```html
<!-- p-table binding -->
[value]="loading() ? skeletonRows : $any(policies())"

<!-- body template -->
<ng-template pTemplate="body" let-rowData>
  @if (loading()) {
    <tr class="skeleton-row">
      <td><p-skeleton height="1rem" /></td>
      <td><p-skeleton height="1rem" width="7rem" /></td>
      <td><p-skeleton height="1rem" width="9rem" /></td>
      <!-- ... 12 cells total ... -->
    </tr>
  } @else {
    <tr [pSelectableRow]="rowData">
      <!-- real data cells -->
    </tr>
  }
</ng-template>
```

**Why not `[loading]`:** PrimeNG's `[loading]` hides the body entirely and renders a single cell spanning all columns. The table width collapses, the spinner floats in an unstyled row, and the header columns shift. With the `[value]` swap approach, the DOM structure is identical during and after load — skeleton cells use the same column widths as real cells.

Added `SkeletonModule` and `ProgressSpinnerModule` to the imports array.

---

## Prompt 14

> The skeleton rows fix the content shift but the table height itself still jumps — skeleton renders 10 rows, real data renders 25 rows so the page grows by 15 rows on every load. Also I still want a spinner visible so users know something is happening — the skeleton alone looks like broken data. Add a spinner overlay on top of the table, and lock the table body to a fixed height so the page never reflows.

**Generated:** Updated `policy-table.component.html`, `policy-table.component.scss`

**Fixed scroll height — eliminates all reflow:**
```html
<p-table
  [scrollable]="true"
  scrollHeight="520px"
  ...>
```

`[scrollable]="true"` with `scrollHeight` tells PrimeNG to render the body in a fixed-height scroll container. The header stays pinned above it. Row count no longer affects page height.

**Spinner overlay — positioned over the scroll container:**
```html
<div class="table-container">
  @if (loading()) {
    <div class="loading-overlay" role="status">
      <p-progressSpinner strokeWidth="3" styleClass="table-spinner" />
    </div>
  }
  <p-table ...>
```

```scss
.table-container {
  position: relative;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-background, #fff) 55%, transparent);
  backdrop-filter: blur(1.5px);
  pointer-events: none;  // header and paginator stay clickable
}
```

**Two-layer UX rationale:**
- Skeleton rows → communicate structure (user sees where data will appear)
- Spinner overlay → communicate activity (something is loading, this isn't broken)

The overlay uses `pointer-events: none` so the header sort icons and paginator remain interactive during load — useful if a user wants to change sort while the current page is still in flight.

---

## Prompt 15

> One more issue: there's a rogue `::ng-deep` block at the bottom of the table SCSS hiding some columns with `nth-child` selectors. The Effective Date column is invisible. Find it and remove it — don't replace it with anything, the column renders fine without it.

**Diagnosed:** Lines 272–301 of `policy-table.component.scss` contained a `::ng-deep` block outside any media query or meaningful selector, explicitly hiding `nth-child(4)`, `nth-child(8)`, `nth-child(9)` at all screen widths. The comments in the block said "Line of Business", "Region", "Underwriter" but the actual nth-child positions mapped to Policyholder, Currency, and **Effective Date**. The block was malformed and had no valid use case.

**Fix:** Entire block removed. Effective Date column became visible immediately.

Also caught and fixed a stale `pTemplate="loadingbody"` template that was still present in the HTML from an earlier iteration — it was dead code since `[loading]` was removed, but it was confusing and removed for clarity.
