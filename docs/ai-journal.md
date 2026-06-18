# AI Development Journal — Policy Dashboard

This journal documents the iterative, AI-assisted development of the Policy Dashboard. Each phase captures the thinking, decisions, and implementation steps as the project evolved from an initial concept to a functional application.

---

## Phase 1 — Backend Foundation

**Goal:** Establish a realistic mock data layer that can support 200+ policies with meaningful variety.

**Thought Process:**

The first question was: where does the data live? A real backend was out of scope for the initial build, but localStorage or hardcoded arrays would make filtering and sorting impossible to validate end-to-end. The answer was a lightweight mock API server — something that behaves like a real HTTP backend but requires no infrastructure.

`json-server` was considered as an off-the-shelf solution. It handles `GET`, `POST`, `PATCH`, and `DELETE` out of the box, but its built-in query handling is too simplistic for compound filters (multi-value status, date ranges, substring search). The decision was to write a custom Node.js server (`policies.js`) that reads and writes `db.json` directly — giving full control over query logic without any framework overhead.

For data generation, a `scripts/generate-db.js` script was written using only Node.js built-ins. It produces 210 policy records with realistic APAC names, region-appropriate currencies, a weighted status distribution (~50% ACTIVE, ~20% PENDING, ~20% EXPIRED, ~10% CANCELLED), and approximately 20% flagged for review.

**Decisions taken:**
- Custom Node.js server instead of default `json-server` CLI
- Data generator script for reproducible, realistic datasets
- 500ms simulated API delay on every response to surface real loading behaviour during development
- CORS headers added so the Angular dev proxy can forward cleanly

**Implementation steps:**
1. Design the `Policy` data shape (id, policyNumber, policyholderName, lineOfBusiness, status, premiumAmount, currency, effectiveDate, expiryDate, region, underwriter, flaggedForReview)
2. Write `generate-db.js` with weighted distributions and APAC locale data
3. Run the generator to produce `db.json`
4. Scaffold `policies.js` with an HTTP server, URL parser, and body reader — no external dependencies

---

## Phase 2 — API Design

**Goal:** Define clean, consistent API contracts for all three endpoints before touching Angular.

**Thought Process:**

Initially, a single `GET /policies` endpoint handling everything (list + summary) seemed appealing. However, summary statistics need to reflect the **entire filtered dataset**, not just the current page. If the summary was derived from the paginated response, a user on page 3 of 9 would see summary numbers that only cover 25 records. This led to separating the concerns into two endpoints.

For the list endpoint, the decision was to accept filters as flat query parameters rather than a JSON body. This keeps the URL bookmarkable and easy to test in a browser. Multi-value filters (status, region, lineOfBusiness) are sent as comma-separated strings (`?status=ACTIVE,PENDING`) rather than repeated params (`?status=ACTIVE&status=PENDING`) to simplify server-side parsing.

The bulk-flag operation (`PATCH /policies/bulk-flag`) was designed to accept an array of IDs and a boolean in the request body rather than issuing one `PATCH /policies/:id` per record. This reduces the number of network roundtrips and the number of `db.json` writes from N to 1.

**Decisions taken:**
- Three distinct endpoints: list, summary, bulk-flag
- Comma-separated multi-value query params
- Single bulk PATCH instead of per-record PATCHes
- `500ms` delay on all endpoints to simulate realistic network conditions

**Implementation steps:**
1. Implement `applyFilters(policies, query)` — handles all filter types
2. Implement `applySorting(policies, sortField, sortOrder)` — null-safe, string and numeric comparison
3. Implement `computeSummary(policies)` — counts, premium totals, LOB breakdown, expiring-soon window
4. Wire up all three route handlers in `policies.js`
5. Test each endpoint manually with curl / browser before proceeding to Angular

---

## Phase 3 — Frontend Data Integration

**Goal:** Connect Angular to the mock API with a clean, side-effect-free service layer.

**Thought Process:**

The Angular service layer needed to be a thin HTTP adapter — no filtering logic, no caching, no state. The only responsibility of `ApiService` is to translate Angular model objects (filters, pagination, sort) into HTTP query parameters and map response shapes back to TypeScript interfaces.

NgRx was chosen for state management after considering component-local signals. The dashboard has three components (`SummaryPanel`, `FilterPanel`, `PolicyTable`, `BulkActions`) that all need access to overlapping state — selected policies, loading status, current filters. Lifting all of that to a single root component with `@Input`/`@Output` chains would create tight coupling. NgRx effects also provide a natural place to orchestrate multi-step async flows (flag → reload policies → reload summary).

One decision that took iteration was the `summaryStats` selector. Initially, the summary was computed inside a `createSelector` from the paginated `policies` array already in the store. This meant the summary panel showed statistics for only the current page — an obvious bug. The fix was to add a dedicated `summaryStats` field to `PolicyState`, populated by a separate `loadSummarySuccess` action dispatched whenever policies are loaded.

URL query param synchronisation was added to make filters, pagination, and sort shareable via browser URL. The `QueryParamsService` serializes state to URL params on every store change and deserializes on initial load — giving deep link support with no extra effort from the user.

**Decisions taken:**
- `ApiService` contains zero filtering logic — pure HTTP adapter
- NgRx over component signals for cross-component state
- `summaryStats` as a dedicated store field populated by a separate API call
- URL query param sync via `QueryParamsService`
- Default sort field is `null` — no sort indicator on initial load

**Implementation steps:**
1. Define `PolicyState` interface with all required fields including `summaryStats`
2. Write NgRx actions: `loadPolicies`, `loadSummary`, `updateBulkFlag`, and their success/failure variants
3. Write reducer handling each action with pure state transitions
4. Write effects: `loadPolicies$` (dispatches `loadSummary` after success), `loadSummary$`, `flagPolicies$`
5. Write `ApiService` with `getPolicies`, `getSummary`, and `bulkFlag` methods
6. Write selectors: `selectLoading`, `selectSummaryStats` (auto-generated from feature state), `selectPoliciesByIds`
7. Configure Angular dev proxy (`proxy.conf.json`) to forward `/policies` to `localhost:3000`

---

## Phase 4 — UI Implementation

**Goal:** Build the four UI regions with clear container/presentation separation and zero business logic in templates.

**Thought Process:**

The dashboard is divided into four visual regions: summary cards, filter panel, bulk action bar, and the data table. Each was implemented as a standalone Angular component. The container (`DashboardContainerComponent`) owns all store subscriptions and passes data down as `input()` signals.

For the policy table, PrimeNG's `p-table` was chosen for its built-in features: lazy loading, client-side selection, sortable columns, and a flexible paginator. The table operates in lazy mode — it does not sort or filter data itself; it only emits events that flow up to the store and then to the API.

Status display was implemented as icon-only (PrimeIcons) rather than text badges. Icons communicate state at a glance without consuming column width.

The `Sort.field` type was made nullable (`PolicySortField | null`) to support a no-sort default state. When `null`, no column shows a sort indicator and no `sortField` parameter is sent to the API.

**Decisions taken:**
- `p-table` in lazy mode — all data operations delegated to server
- Icon-based status column to conserve horizontal space
- Nullable sort field with `null` default (no initial sort)
- `OnPush` change detection on all components for performance
- `trackBy` on table rows to prevent unnecessary DOM re-renders

**Implementation steps:**
1. Build `PolicyTableComponent` with header, body, empty, and loading templates
2. Build `SummaryPanelComponent` with metric cards and LOB premium breakdown
3. Build `FilterPanelComponent` with multi-select dropdowns and date range pickers
4. Build `BulkActionsComponent` with flag/unflag buttons and success toast
5. Wire container component to store and pass data to each child
6. Add URL query param sync in `ngOnInit`

---

## Phase 5 — UX Enhancements

**Goal:** Polish the loading experience and stabilise the table layout.

**Thought Process:**

The initial loading state showed a spinner overlay but the table would shift in height as the spinner appeared and disappeared. This was because the table body height was driven by its content — 10 skeleton rows had a different height from 25 real rows, causing the page to reflow on every load.

The fix was to switch `p-table` to scrollable mode with a fixed `scrollHeight`. This locks the body to a constant pixel height regardless of row count, completely eliminating reflow.

For the skeleton rows, the approach of passing a `skeletonRows` array (10 empty items) as the `[value]` binding when loading was chosen. This causes the body template to render exactly 10 times, each rendering a row of `p-skeleton` cells that match the real column layout precisely. A separate `p-progressSpinner` overlay provides the visual loading indicator on top.

The two mechanisms — skeleton rows and spinner — serve different purposes: the skeleton communicates structure (the user sees where data will appear), while the spinner communicates activity (something is happening).

**Decisions taken:**
- `[scrollable]="true"` + `scrollHeight="520px"` to fix layout shift
- Custom spinner overlay (not PrimeNG's `[loading]` property) to avoid conflict with skeleton rows
- Skeleton rows driven by a `skeletonRows = Array.from({ length: 10 })` array — no additional template machinery
- `pointer-events: none` on the overlay so header sorting and pagination remain interactive during load

**Implementation steps:**
1. Wrap `p-table` in `.table-container` with `position: relative`
2. Add `p-progressSpinner` inside `.loading-overlay` controlled by `@if (loading())`
3. Switch `[value]` binding to `loading() ? skeletonRows : $any(policies())`
4. Use `@if (loading())` inside `pTemplate="body"` to branch between skeleton cells and real cells
5. Add `[scrollable]="true"` and `scrollHeight="520px"` to `p-table`
6. Clean up SCSS: remove rogue `::ng-deep` blocks, consolidate into single scoped block
