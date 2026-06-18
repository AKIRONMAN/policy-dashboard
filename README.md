# Policy Dashboard

An Angular 19 single-page application for managing APAC insurance policies. Provides server-driven filtering, sorting, pagination, bulk flagging, and real-time summary analytics — backed by a lightweight Node.js mock API that serves 210 realistic policy records.

---

## Table of Contents

- [What the App Does](#what-the-app-does)
- [Prerequisites](#prerequisites)
- [Known Issue — Fix Before Installing](#known-issue--fix-before-installing)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [What to Expect](#what-to-expect)
- [Project Docs](#project-docs)

---

## What the App Does

The dashboard manages 210 APAC insurance policies across six regions (Japan, Singapore, Australia, Hong Kong, South Korea, Thailand). Key capabilities:

| Feature | Detail |
|---|---|
| **Summary panel** | 6 metric cards: total, active, pending, expired, flagged, total premium. Always reflects the entire filtered dataset (not just the current page). |
| **Filter panel** | Multi-select status, line of business, and region; underwriter text search; effective and expiry date ranges. Filters are URL-synced (shareable links). |
| **Policy table** | 12 columns, server-side sort and pagination (25 per page), checkbox multi-select, icon-based status column. |
| **Bulk actions** | Flag or unflag any selection of policies in one PATCH call. Changes are persisted to `db.json`. |
| **Loading UX** | Skeleton rows + spinner overlay during every load. Fixed table height (`scrollHeight: 520px`) — zero layout shift between states. |
| **Dark mode** | Toggleable via the header theme switch. |

The Angular layer contains **zero filtering logic** — all query operations run in the Node.js mock server. Swapping in a real backend requires only changing the base URL in `ApiService`.

---

## Prerequisites

| Tool | Required Version | Check |
|---|---|---|
| **Node.js** | `18.19.1` or later (LTS recommended: `20.x`) | `node --version` |
| **npm** | `9.x` or later | `npm --version` |
| **Angular CLI** | `19.x` | `ng version` |

> Angular 19 does **not** support Node 16 or earlier. If `node --version` shows anything below `18.19.1`, update Node before proceeding.

Install the Angular CLI globally if not already present:

```bash
npm install -g @angular/cli@19
```

---

## Known Issue — Fix Before Installing

> **BLOCKING — BUILD FAILURE: Missing `@angular/animations`**
>
> **Severity:** Build-blocking  
> **Problem:** PrimeNG v19 declares `@angular/animations` as a peer dependency. It is not included in `package.json` by default, which causes multiple PrimeNG modules (table, skeleton, progress-spinner, overlay) to fail to resolve during `ng build` and `ng serve`.  
> **Error you will see:**
> ```
> ERROR: Cannot find module '@angular/animations'
> Module not found: Error resolving '@angular/animations'
> ```
> **Fix (5 minutes):** Run this once before `npm install`:
>
> ```bash
> npm install @angular/animations@^19.2.0
> ```
>
> This adds it to `dependencies` alongside the other `@angular/*` packages. Alternatively, add it manually to `package.json`:
>
> ```json
> "@angular/animations": "^19.2.0"
> ```
>
> Then run `npm install` to resolve.

---

## Installation

```bash
# 1. Install @angular/animations peer dependency first (see above)
npm install @angular/animations@^19.2.0

# 2. Install all remaining dependencies
npm install

# 3. Generate the policy dataset (creates db.json with 210 records)
npm run generate:data
```

> `generate:data` only needs to be run once. Re-running it regenerates `db.json` from scratch and resets any bulk-flag changes made during testing.

---

## Running the App

The app has two processes that must run simultaneously — the mock API server and the Angular dev server. Open two terminals.

**Terminal 1 — Mock API server (port 3000):**

```bash
npm run mock:api
```

You should see no output — the server starts silently on `http://localhost:3000`. All responses are delayed by 500ms to surface real loading behaviour during development.

**Terminal 2 — Angular dev server (port 4200):**

```bash
npm start
```

Angular CLI proxies `/policies` requests to `localhost:3000` via `proxy.conf.json`. The proxy is pre-configured — no manual setup needed.

**Open the app:**

```
http://localhost:4200
```

---

## What to Expect

On first load:

1. The summary panel shows **6 skeleton placeholders** while the initial API call is in flight.
2. The policy table shows **10 skeleton rows** with a spinner overlay. The table height is fixed — the page does not jump when real data arrives.
3. After ~500ms, both areas populate with live data: 210 policies, paginated 25 per page.

**Filtering:** Changing any filter (status, LOB, region, date range) immediately triggers a new API call. Summary cards update to reflect the filtered totals, not the current page.

**Sorting:** Click any column header to sort. The initial load has **no default sort** — no column shows a sort indicator until you interact. Sort state is persisted in the URL.

**Bulk flagging:** Select rows via the checkboxes, then click **Flag** or **Unflag** in the action bar. The change is written to `db.json` and the table reloads automatically.

**URL sharing:** Filters, page, and sort are all in the URL query string. Copy the URL to share or restore an exact view.

---

## Project Docs

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System architecture, component tree, NgRx store shape, API contracts, data flow diagram, and scalability considerations. |
| [`docs/tradeoffs.md`](docs/tradeoffs.md) | Seven key architectural decisions with alternatives considered and trade-off tables: custom mock server vs json-server, server-side vs frontend filtering, NgRx vs signals, separate summary endpoint, icon-based status column, nullable sort field, skeleton + spinner UX. |
| [`TESTING.md`](TESTING.md) | Test suite overview: 13 spec files, 500+ test cases covering core services, NgRx state, HTTP interceptor, and all 5 UI components. Test commands and coverage guide. |
| [`docs/AI-WORKING-JOURNAL.md`](docs/AI-WORKING-JOURNAL.md) | Full AI-assisted development session log: 15 prompts across 6 commits, from backend scaffolding through loading UX. Useful for understanding why specific implementation choices were made. |

---

## Available Scripts

| Script | What it does |
|---|---|
| `npm start` | Start Angular dev server on port 4200 |
| `npm run mock:api` | Start Node.js mock API server on port 3000 |
| `npm run generate:data` | Regenerate `db.json` with 210 fresh policy records |
| `npm run build` | Production build (output: `dist/`) |
| `npm test` | Run unit tests in watch mode (Karma + Jasmine) |
| `npm run test:coverage` | Run tests once with full coverage report |
| `npm run test:ci` | Run tests headless (for CI pipelines) |
