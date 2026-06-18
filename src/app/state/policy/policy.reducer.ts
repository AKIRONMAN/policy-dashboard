import { createFeature, createReducer, on } from '@ngrx/store';
import { initialPolicyState, PolicyState, DEFAULT_PAGINATION } from '../../shared/models';
import {
  loadPolicies,
  loadPoliciesSuccess,
  loadPoliciesFailure,
  loadSummarySuccess,
  updateFilters,
  updatePagination,
  updateSort,
  updateSelection,
  clearSelection,
  updateBulkFlag,
} from './policy.actions';

export type { PolicyState };

export const policyFeature = createFeature({
  name: 'policy',
  reducer: createReducer(
    initialPolicyState,

    on(loadPolicies, (state) => ({
      ...state,
      loadStatus: 'loading' as const,
      error: null,
    })),

    on(loadPoliciesSuccess, (state, { policies, pagination }) => ({
      ...state,
      policies,
      pagination,
      loadStatus: 'success' as const,
      error: null,
    })),

    on(loadPoliciesFailure, (state, { error }) => ({
      ...state,
      loadStatus: 'error' as const,
      error,
    })),

    on(loadSummarySuccess, (state, { summary }) => ({
      ...state,
      summaryStats: summary,
    })),

    on(updateFilters, (state, { filters }) => ({
      ...state,
      filters,
      pagination: DEFAULT_PAGINATION,
    })),

    on(updatePagination, (state, { page, pageSize }) => ({
      ...state,
      pagination: {
        ...state.pagination,
        page,
        pageSize,
      },
    })),

    on(updateSort, (state, { sort }) => ({
      ...state,
      sort,
      pagination: DEFAULT_PAGINATION,
    })),

    on(updateSelection, (state, { selectedPolicies }) => ({
      ...state,
      selectedPolicyIds: selectedPolicies.map((p) => p.id),
    })),

    on(clearSelection, (state) => ({
      ...state,
      selectedPolicyIds: [],
    })),

    // Optimistic update: reflect flag change immediately while API call is in-flight
    on(updateBulkFlag, (state, { policyIds, flagStatus }) => ({
      ...state,
      policies: state.policies.map((policy) =>
        policyIds.includes(policy.id)
          ? { ...policy, flaggedForReview: flagStatus }
          : policy
      ),
    }))
  ),
});
