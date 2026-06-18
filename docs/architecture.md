# Architecture — Policy Dashboard

## Overview

The Policy Dashboard is a production-grade Angular 19 single-page application designed to manage APAC insurance policies. It provides real-time filtering, sorting, pagination, bulk operations, and summary analytics. The architecture is designed for clarity, testability, and a clean separation between the data layer and the UI layer.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Angular SPA                         │
│                                                         │
│   ┌─────────────┐      ┌──────────────────────────┐    │
│   │  Components │─────▶│       NgRx Store          │    │
│   │  (Dumb/Smart│◀─────│  Actions / Reducers /     │    │
│   │   Pattern)  │      │  Effects / Selectors      │    │
│   └─────────────┘      └────────────┬─────────────┘    │
│                                     │                   │
│                              ┌──────▼──────┐            │
│                              │  ApiService  │            │
│                              │  (HTTP Layer)│            │
└──────────────────────────────┴──────┬───────────────────┘
                                      │ HTTP (proxied)
                               ┌──────▼──────┐
                               │  policies.js │
                               │ (Node server)│
                               └──────┬───────┘
                                      │ reads / writes
                               ┌──────▼──────┐
                               │   db.json    │
                               │ (200+ records│
                               └─────────────┘
```

---

## Data Flow

```
User Interaction
      ↓
Angular Component  (dispatches NgRx Action)
      ↓
NgRx Effect        (calls ApiService)
      ↓
ApiService         (builds HttpParams, calls HTTP endpoint)
      ↓
Angular Dev Proxy  (proxy.conf.json: /policies → localhost:3000)
      ↓
policies.js        (filters, sorts, paginates, computes summary)
      ↓
db.json            (source of truth for policy records)
      ↑
Response flows back up the same chain
```

All filtering, sorting, and pagination logic lives **on the server** (`policies.js`). The Angular layer is responsible only for building query parameters and rendering results.

---

## Component Structure

```
DashboardContainerComponent          ← Smart / Container
│
├── SummaryPanelComponent            ← Dumb / Presentational
├── FilterPanelComponent             ← Dumb / Presentational
├── BulkActionsComponent             ← Smart (reads from Store)
└── PolicyTableComponent             ← Dumb / Presentational
```

### Container vs Presentation

| Layer | Responsibility |
|---|---|
| Container (`DashboardContainerComponent`) | Connects Store to child components, dispatches actions, manages URL query param sync |
| Presentation | Receive `input()` signals, emit `output()` events, contain zero business logic |

This separation allows each presentational component to be developed and tested in isolation.

---

## State Management — NgRx

NgRx is chosen over component-local signals for state that must be shared across multiple components and persisted across navigation (via URL sync).

### Store Shape

```typescript
PolicyState {
  policies:          Policy[]          // current page of policies
  filters:           PolicyFilters     // active filter values
  pagination:        Pagination        // page, pageSize, total, totalPages
  sort:              Sort              // active sort field + direction
  selectedPolicyIds: string[]          // IDs selected via checkboxes
  loadStatus:        PolicyLoadStatus  // idle | loading | success | error
  error:             string | null
  summaryStats:      PolicySummary     // computed by server, NOT from paginated policies
}
```

### Key Design Decision — Summary from API

`summaryStats` is populated by a dedicated `GET /policies/summary` call that applies the **same filters** without pagination. This ensures the summary panel always reflects the entire filtered dataset, not just the current visible page.

---

## API Design

The mock backend (`policies.js`) exposes three endpoints:

### `GET /policies`

Returns a paginated, filtered, sorted page of policies.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 25) |
| `search` | string | Full-text match on policyNumber, holder, underwriter |
| `status` | string | Comma-separated: `ACTIVE,PENDING` |
| `lineOfBusiness` | string | Comma-separated: `PROPERTY,MARINE` |
| `region` | string | Comma-separated: `Singapore,Japan` |
| `underwriter` | string | Substring match |
| `flagged` | boolean | `true` or `false` |
| `effectiveDateFrom` | ISO date | Range start |
| `effectiveDateTo` | ISO date | Range end |
| `expiryDateFrom` | ISO date | Range start |
| `expiryDateTo` | ISO date | Range end |
| `sortField` | string | Field name to sort by |
| `sortOrder` | `ASC` \| `DESC` | Sort direction |

**Response:**
```json
{
  "data": [ ...Policy[] ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 210,
    "totalPages": 9
  }
}
```

---

### `GET /policies/summary`

Accepts the same filter params as `GET /policies` (no pagination). Returns aggregate statistics for the filtered dataset.

**Response:**
```json
{
  "totalPolicies": 210,
  "activePolicies": 101,
  "pendingPolicies": 42,
  "expiredPolicies": 51,
  "cancelledPolicies": 16,
  "flaggedForReview": 42,
  "expiringSoonPolicies": 7,
  "totalPremium": 145000000,
  "lobPremiumMap": {
    "PROPERTY": 48000000,
    "CASUALTY": 39000000,
    "MARINE":   36000000,
    "A&H":      22000000
  },
  "currency": "USD"
}
```

---

### `PATCH /policies/bulk-flag`

Updates `flaggedForReview` for a batch of policies and persists to `db.json`.

**Request body:**
```json
{
  "policyIds": ["policy-1", "policy-42"],
  "flagged": true
}
```

**Response:**
```json
{
  "success": true,
  "updatedCount": 2
}
```

---

## Separation of Concerns

| Layer | Concern |
|---|---|
| `db.json` | Raw data storage |
| `policies.js` | Query logic: filtering, sorting, pagination, summary computation |
| `ApiService` | HTTP client: builds params, maps responses to Angular model shapes |
| NgRx Effects | Orchestration: when to call which API, how to chain calls |
| NgRx Reducer | Pure state transitions |
| NgRx Selectors | Derived state (e.g. `selectLoading`, `selectSummaryStats`) |
| Components | Rendering and event delegation only |

---

## Scalability Considerations

- **Server-side logic**: Moving filtering and sorting to `policies.js` (rather than the Angular layer) means swapping the mock server for a real backend requires only changing the base URL in `ApiService` — no Angular code changes needed.
- **Pagination**: All data fetches are paginated. The Angular layer never loads the full dataset into memory.
- **Summary decoupled from pagination**: `selectSummaryStats` reads from `state.summaryStats`, populated by a separate API call. Adding new metrics requires only a server-side change.
- **NgRx feature state**: The policy feature state is self-contained and can be lazy-loaded with the dashboard route.
- **URL-driven state**: Filters, pagination, and sort are serialized to URL query params, enabling deep linking and shareable filter views.
