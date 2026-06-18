import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { take, combineLatest } from 'rxjs/operators';
import { BulkActionsComponent } from '../../components/bulk-actions/bulk-actions.component';
import { FilterPanelComponent } from '../../components/filter-panel/filter-panel.component';
import { PolicyTableComponent } from '../../components/policy-table/policy-table.component';
import { SummaryPanelComponent } from '../../components/summary-panel/summary-panel.component';
import {
  loadPolicies,
  updateFilters,
  updatePagination,
  updateSort,
  updateSelection,
  clearSelection,
} from '../../../../state/policy/policy.actions';
import {
  selectPolicies,
  selectLoading,
  selectError,
  selectSummaryStats,
  selectFilters,
  selectPagination,
  selectSort,
  selectSelectedPolicyIds,
} from '../../../../state/policy/policy.selectors';
import { PolicyFilters, Pagination, Sort, DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, DEFAULT_SORT, DEFAULT_POLICY_SUMMARY } from '../../../../shared/models';
import { QueryParamsService } from '../../../../core/services/query-params.service';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    SummaryPanelComponent,
    FilterPanelComponent,
    PolicyTableComponent,
    BulkActionsComponent,
  ],
  template: `
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ accessibilityMessage() }}
    </div>
    <app-summary-panel
      [summary]="(summaryStats$ | async) ?? DEFAULT_POLICY_SUMMARY"
      [loading]="(loading$ | async) ?? false"
    />
    <app-filter-panel 
      [filters]="(filters$ | async) ?? DEFAULT_POLICY_FILTERS"
      (filtersChange)="onFiltersChange($event)"
      (clearFilters)="onClearFilters()"
    />
    <app-bulk-actions />
    <app-policy-table
      [policies]="(policies$ | async) ?? []"
      [loading]="(loading$ | async) ?? false"
      [pagination]="(pagination$ | async) ?? DEFAULT_PAGINATION"
      [sort]="(sort$ | async) ?? DEFAULT_SORT"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (selectionChange)="onSelectionChange($event)"
    />
  `,
})
export class DashboardContainerComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamsService = inject(QueryParamsService);

  protected readonly DEFAULT_POLICY_SUMMARY = DEFAULT_POLICY_SUMMARY;
  protected readonly DEFAULT_PAGINATION = DEFAULT_PAGINATION;
  protected readonly DEFAULT_POLICY_FILTERS = DEFAULT_POLICY_FILTERS;
  protected readonly DEFAULT_SORT = DEFAULT_SORT;
  readonly accessibilityMessage = signal<string>('');

  // Observables from store
  readonly policies$ = this.store.select(selectPolicies);
  readonly loading$ = this.store.select(selectLoading);
  readonly error$ = this.store.select(selectError);
  readonly summaryStats$ = this.store.select(selectSummaryStats);
  readonly filters$ = this.store.select(selectFilters);
  readonly pagination$ = this.store.select(selectPagination);
  readonly sort$ = this.store.select(selectSort);
  readonly selectedPolicyIds$ = this.store.select(selectSelectedPolicyIds);

  ngOnInit(): void {
    // 1. Initialize state from URL query params (single source of truth on initial load)
    // This must run first to restore state before any subscriptions
    this.initializeFromQueryParams();

    // 2. Setup continuous sync: listen to store changes and update URL
    // This will propagate subsequent state changes to URL without reloading
    this.syncStoreToQueryParams();

    // 3. Setup accessibility announcements for loading, loaded, and error states
    this.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isLoading) => {
        if (isLoading) {
          this.accessibilityMessage.set('Loading policies, please wait...');
        }
      });

    this.policies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((policies) => {
        this.loading$.pipe(take(1)).subscribe((isLoading) => {
          if (!isLoading) {
            this.accessibilityMessage.set(`Policies loaded. Found ${policies.length} policies.`);
          }
        });
      });

    this.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => {
        if (error) {
          this.accessibilityMessage.set(`Error loading policies: ${error}`);
        }
      });
  }

  /**
   * Initialize component state from URL query params on first load
   * 
   * This method:
   * 1. Reads query params from ActivatedRoute (take(1) for single emission)
   * 2. Deserializes and validates filters, pagination, and sort
   * 3. Merges deserialized values with defaults (fallback for missing/invalid params)
   * 4. Dispatches NgRx actions to update store state
   * 5. Dispatches loadPolicies to fetch data
   * 
   * The URL is the single source of truth on component initialization.
   * This ensures deep linking works: users can share a URL and others will load the same filtered view.
   * 
   * Example URL: ?search=premium&statuses=ACTIVE&page=2&sortBy=premiumAmount&sortDir=desc
   * 
   * Invalid parameters are ignored and replaced with defaults:
   * - Invalid sort field: falls back to DEFAULT_SORT
   * - Invalid page number: falls back to page 1
   * - Invalid filter values: filtered out
   */
  private initializeFromQueryParams(): void {
    this.route.queryParams
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams) => {
        // Deserialize query params with full validation
        const { filters: urlFilters, pagination: urlPagination, sort: urlSort } =
          this.queryParamsService.deserializeFromQueryParams(queryParams);

        // Merge deserialized values with defaults (missing params get default values)
        const filters = { ...DEFAULT_POLICY_FILTERS, ...urlFilters };
        const pagination = { ...DEFAULT_PAGINATION, ...urlPagination };
        const sort = { ...DEFAULT_SORT, ...urlSort };

        // Update store with merged state (all invalid params replaced with defaults)
        this.store.dispatch(updateFilters({ filters }));
        this.store.dispatch(updatePagination({ page: pagination.page, pageSize: pagination.pageSize }));
        this.store.dispatch(updateSort({ sort }));

        // Load policies with fully validated and merged state
        this.store.dispatch(loadPolicies({ filters, pagination, sort }));
      });
  }

  /**
   * Listen to store changes and update URL query params
   * 
   * This method:
   * 1. Subscribes to store changes (filters, pagination, sort)
   * 2. Serializes state to clean URL query params
   * 3. Updates browser URL without reloading component
   * 4. Enables bookmarking, sharing, and browser back/forward
   * 
   * This runs continuously after initialization, keeping URL in sync with state.
   * Note: The initial state comes from URL params (see initializeFromQueryParams),
   * so syncStoreToQueryParams doesn't create duplicate API calls.
   */
  private syncStoreToQueryParams(): void {
    this.store
      .select((state) => ({
        filters: selectFilters(state),
        pagination: selectPagination(state),
        sort: selectSort(state),
      }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ filters, pagination, sort }) => {
        // Update URL without reloading component
        this.queryParamsService.updateQueryParams(filters, pagination, sort);
      });
  }

  onFiltersChange(filters: PolicyFilters): void {
    this.store.dispatch(updateFilters({ filters }));
    // Load policies with updated filters and current pagination/sort
    this.store
      .select((state) => ({
        pagination: selectPagination(state),
        sort: selectSort(state),
      }))
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ pagination, sort }) => {
        this.store.dispatch(loadPolicies({ filters, pagination, sort }));
      });
  }

  onPageChange(event: { page: number; pageSize: number }): void {
    const pagination: Pagination = {
      page: event.page,
      pageSize: event.pageSize,
      totalItems: 0,
      totalPages: 0,
    };
    this.store.dispatch(updatePagination({ page: event.page, pageSize: event.pageSize }));
    // Load policies with updated pagination and current filters/sort
    this.store
      .select((state) => ({
        filters: selectFilters(state),
        sort: selectSort(state),
      }))
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ filters, sort }) => {
        this.store.dispatch(loadPolicies({ filters, pagination, sort }));
      });
  }

  onSortChange(event: { field: string; direction: string }): void {
    const sort: Sort = {
      field: event.field as Sort['field'],
      direction: event.direction as Sort['direction'],
    };
    this.store.dispatch(updateSort({ sort }));
    // Load policies with updated sort and current filters/pagination
    this.store
      .select((state) => ({
        filters: selectFilters(state),
        pagination: selectPagination(state),
      }))
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ filters, pagination }) => {
        this.store.dispatch(loadPolicies({ filters, pagination, sort }));
      });
  }

  onSelectionChange(policies: readonly any[]): void {
    if (policies.length === 0) {
      this.store.dispatch(clearSelection());
    } else {
      this.store.dispatch(updateSelection({ selectedPolicies: policies as any[] }));
    }
  }

  onClearFilters(): void {
    // Reset all state to defaults
    const filters = DEFAULT_POLICY_FILTERS;
    const pagination = DEFAULT_PAGINATION;
    const sort = DEFAULT_SORT;

    // Update store
    this.store.dispatch(updateFilters({ filters }));
    this.store.dispatch(updatePagination({ page: pagination.page, pageSize: pagination.pageSize }));
    this.store.dispatch(updateSort({ sort }));
    this.store.dispatch(updateSelection({ selectedPolicies: [] }));

    // Load policies with defaults
    this.store.dispatch(loadPolicies({ filters, pagination, sort }));

    // Update URL (remove query params)
    this.queryParamsService.updateQueryParams(filters, pagination, sort);
  }
}
