# Architectural Trade-offs — Policy Dashboard

This document records the key architectural decisions made during development, the alternatives that were considered, and the reasoning behind each choice.

---

## 1. Mock Backend: Custom `policies.js` vs `json-server` CLI

**Decision:** Write a custom Node.js HTTP server instead of using `json-server`'s default CLI.

**Alternatives considered:**
- `json-server` CLI with `--routes` and `--middlewares` flags
- In-memory Angular service with `localStorage` persistence
- Full Express server with `@faker-js/faker`

**Why chosen:**
`json-server`'s built-in query handling supports only simple key equality filters. The dashboard requires compound, multi-value filters (comma-separated status, date ranges, substring search on multiple fields), a separate `/summary` endpoint with aggregation logic, and a bulk PATCH operation. None of these are achievable with the default CLI.

A custom Node.js server using only built-in modules (`http`, `fs`, `url`) has zero external dependencies and is easy to read and extend. It also mirrors exactly how a real backend would expose these endpoints, making migration straightforward.

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Full control over filter/sort/aggregate logic | More initial code than off-the-shelf solution |
| Mirrors real-backend contract exactly | Manual route registration |
| Zero extra dependencies | No auto-generated CRUD (not needed here) |

---

## 2. Server-Side Filtering vs Frontend Filtering

**Decision:** All filtering, sorting, and pagination logic lives in `policies.js`, not in Angular.

**Alternatives considered:**
- Fetch all 210 records on app load, filter/sort in Angular memory
- Hybrid: fetch once, filter in NgRx selectors

**Why chosen:**
Filtering in the Angular layer means loading the full dataset on every page load. At 210 records this is manageable, but the architecture would break at 10,000+ records. Delegating query logic to the server keeps Angular as a pure rendering layer.

Importantly, the summary statistics must reflect the **entire filtered dataset**, not just the current page. Server-side filtering makes this trivial: `GET /policies/summary` runs the same filter on all records. If filtering were in Angular, the summary would have to iterate over an in-memory array that may not match what the table is showing (due to pagination).

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Scales to large datasets without code changes | Each filter change triggers a network request |
| Summary always matches filters correctly | Requires 500ms round-trip per interaction |
| Clean separation: Angular has no filter logic | Slightly more complex `ApiService.buildParams()` |

---

## 3. NgRx vs Component-Local Signals

**Decision:** NgRx Store for all application state.

**Alternatives considered:**
- Angular signals with a root-level service
- A single parent component holding all state with `@Input`/`@Output` chains

**Why chosen:**
The dashboard has four distinct components that all read overlapping state: `loading`, `filters`, `selectedPolicyIds`, `summaryStats`, `pagination`. With component-local signals, either every component would inject the same service (coupling them to implementation), or state would be passed through multiple layers of `@Input`/`@Output` (creating a fragile prop-drilling chain).

NgRx provides:
- A single source of truth for all shared state
- Effects as the canonical place for async orchestration (the flag → reload → summary chain is a natural fit)
- Selectors with memoization (no recomputation unless inputs change)
- Redux DevTools for time-travel debugging

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Predictable, testable state transitions | More boilerplate (actions, reducers, effects, selectors) |
| Effects handle async flows cleanly | Steeper learning curve |
| DevTools for debugging | Heavier bundle than a signal service |
| URL sync is straightforward | Overkill for a trivial component |

---

## 4. Separate `/policies/summary` Endpoint vs Derived Selector

**Decision:** Summary statistics are fetched from a dedicated API endpoint, stored in `state.summaryStats`, and never computed from paginated data.

**Alternatives considered:**
- `createSelector` computing summary from `state.policies` (the current page)
- Fetching all records in parallel and computing summary in Angular

**Why chosen:**
Computing summary from `state.policies` is the most obvious approach, but it is fundamentally wrong: `state.policies` contains only the current page (e.g., 25 of 210 records). Summary numbers derived from this would show the total premium for 25 policies, not the entire filtered set.

A dedicated `GET /policies/summary` endpoint applies the same filters to all records and returns pre-computed aggregates. The Angular layer simply stores and displays the result.

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Summary always correct regardless of page | Extra network request on every filter/page change |
| Server computes aggregates efficiently | `loadSummary` action/effect/reducer to wire up |
| Trivial to add new metrics server-side | Slight UI delay before summary updates |

---

## 5. Icon-Based Status Column vs Text Badges

**Decision:** Policy status is displayed as a coloured icon (check-circle, clock, times-circle, ban) rather than a text badge.

**Alternatives considered:**
- PrimeNG `<p-tag>` with coloured backgrounds
- Plain text with colour-coded CSS classes
- Icon + tooltip only

**Why chosen:**
With 12 columns in the table, horizontal space is at a premium. An icon occupies roughly 20px versus ~80px for a badge with text. Icons are instantly recognisable for standard states (active = green check, expired = red X) and free up space for higher-value columns like premium amount and policy holder name.

Tooltips on each icon (`[title]="rowData.status"`) ensure accessibility and clarity for users unfamiliar with the icon mapping.

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Saves significant horizontal space | Requires learning the icon convention |
| Colour communicates urgency instantly | Icons alone may not meet WCAG AA without tooltips |
| Clean, minimal appearance | Less descriptive than text at first glance |

---

## 6. Nullable Sort Field

**Decision:** `Sort.field` is typed as `PolicySortField | null`, defaulting to `null`.

**Alternatives considered:**
- Default sort by `effectiveDate DESC`
- Default sort by `policyNumber ASC`
- Always require a sort field

**Why chosen:**
Defaulting to `effectiveDate DESC` caused a visual side-effect: the Effective Date column header always showed a sort indicator on page load, even when the user had not interacted with sorting. This created the impression that data was pre-filtered or ordered in a specific way without user intent.

Making the field nullable and defaulting to `null` sends no `sortField` or `sortOrder` query parameters on the initial load. The server returns policies in natural insertion order. When the user clicks a column header, the sort field is set and persists in the URL.

**Trade-offs:**
| Benefit | Cost |
|---|---|
| No misleading sort indicator on load | Initial data order is non-deterministic |
| Clean URL on first visit | `Sort.field` type is slightly more complex |
| User sort intent is explicit | Extra null checks in `ApiService.buildParams` |

---

## 7. Skeleton Loading + Spinner Overlay vs Spinner Only

**Decision:** Skeleton rows (structural placeholders) combined with a `p-progressSpinner` overlay.

**Alternatives considered:**
- Spinner overlay only (hide table body during load)
- Loading text row in `pTemplate="loadingbody"`
- Skeleton rows only (no spinner)

**Why chosen:**
A spinner-only approach hides the table structure during load, causing a layout shift when real data appears (the table grows from zero height to full height). Skeleton rows maintain the exact table structure — same number of rows, same column widths — so the layout is stable.

The spinner overlay is added on top of the skeleton rows to communicate that loading is actively in progress, satisfying users who might otherwise mistake skeleton rows for a broken state.

Using `scrollHeight="520px"` on the scrollable table body ensures the container height is always fixed, completely eliminating reflow regardless of whether skeleton or real rows are rendered.

**Trade-offs:**
| Benefit | Cost |
|---|---|
| Zero layout shift between loading and loaded | Slightly more complex template logic |
| Skeleton communicates structure | 10 skeleton rows × 12 cells = 120 DOM nodes during load |
| Spinner communicates activity | Spinner + skeleton can feel redundant |
| Fixed scroll height prevents reflow | `scrollHeight` must be chosen carefully |
