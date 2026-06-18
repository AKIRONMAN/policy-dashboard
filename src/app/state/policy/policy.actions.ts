import { createAction, props } from '@ngrx/store';
import { Policy, PolicyFilters, Pagination, Sort, PolicySummary } from '../../shared/models';

// Load Policies
export const loadPolicies = createAction(
  '[Policy] Load Policies',
  props<{ filters: PolicyFilters; pagination: Pagination; sort: Sort }>()
);

export const loadPoliciesSuccess = createAction(
  '[Policy] Load Policies Success',
  props<{ policies: Policy[]; pagination: Pagination }>()
);

export const loadPoliciesFailure = createAction(
  '[Policy] Load Policies Failure',
  props<{ error: string }>()
);

// Filters Update
export const updateFilters = createAction(
  '[Policy] Update Filters',
  props<{ filters: PolicyFilters }>()
);

// Pagination Update
export const updatePagination = createAction(
  '[Policy] Update Pagination',
  props<{ page: number; pageSize: number }>()
);

// Sorting Update
export const updateSort = createAction(
  '[Policy] Update Sort',
  props<{ sort: Sort }>()
);

// Selection Update
export const updateSelection = createAction(
  '[Policy] Update Selection',
  props<{ selectedPolicies: Policy[] }>()
);

// Clear Selection
export const clearSelection = createAction(
  '[Policy] Clear Selection'
);

// Bulk Flag Action
export const updateBulkFlag = createAction(
  '[Policy] Update Bulk Flag',
  props<{ policyIds: string[]; flagStatus: boolean }>()
);

// Summary Actions
export const loadSummary = createAction(
  '[Policy] Load Summary',
  props<{ filters: PolicyFilters }>()
);

export const loadSummarySuccess = createAction(
  '[Policy] Load Summary Success',
  props<{ summary: PolicySummary }>()
);

export const loadSummaryFailure = createAction(
  '[Policy] Load Summary Failure',
  props<{ error: string }>()
);


