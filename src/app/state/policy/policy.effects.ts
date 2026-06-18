import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  loadPolicies,
  loadPoliciesSuccess,
  loadPoliciesFailure,
  loadSummary,
  loadSummarySuccess,
  loadSummaryFailure,
  updateBulkFlag,
  clearSelection,
} from './policy.actions';
import { selectFilters, selectPagination, selectSort } from './policy.selectors';

@Injectable()
export class PolicyEffects {
  private readonly actions$ = inject(Actions);
  private readonly apiService = inject(ApiService);
  private readonly store = inject(Store);

  // Load the current page of policies from the API
  loadPolicies$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPolicies),
      switchMap(({ filters, pagination, sort }) =>
        this.apiService.getPolicies(filters, pagination, sort).pipe(
          switchMap(({ policies, pagination: updatedPagination }) => [
            loadPoliciesSuccess({ policies, pagination: updatedPagination }),
            // Trigger a summary refresh in parallel so summary always matches filters
            loadSummary({ filters }),
          ]),
          catchError((error) =>
            of(loadPoliciesFailure({ error: error.message ?? 'Failed to load policies' }))
          )
        )
      )
    )
  );

  // Load aggregate summary stats for the current filters (no pagination)
  loadSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSummary),
      switchMap(({ filters }) =>
        this.apiService.getSummary(filters).pipe(
          map((summary) => loadSummarySuccess({ summary })),
          catchError((error) =>
            of(loadSummaryFailure({ error: error.message ?? 'Failed to load summary' }))
          )
        )
      )
    )
  );

  // Bulk flag/unflag: call API, then reload policies and summary
  flagPolicies$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBulkFlag),
      withLatestFrom(
        this.store.select(selectFilters),
        this.store.select(selectPagination),
        this.store.select(selectSort)
      ),
      switchMap(([{ policyIds, flagStatus }, filters, pagination, sort]) =>
        this.apiService.bulkFlag(policyIds, flagStatus).pipe(
          switchMap(() => {
            this.store.dispatch(clearSelection());
            return of(loadPolicies({ filters, pagination, sort }));
          }),
          catchError((error) =>
            of(loadPoliciesFailure({ error: error.message ?? 'Failed to update flag status' }))
          )
        )
      )
    )
  );
}
