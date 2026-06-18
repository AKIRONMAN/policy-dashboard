import { policyFeature } from './policy.reducer';
import { initialPolicyState } from '../../shared/models/policy-state.model';
import { DEFAULT_PAGINATION } from '../../shared/models/pagination.model';
import { DEFAULT_SORT } from '../../shared/models/sort.model';
import { DEFAULT_POLICY_FILTERS } from '../../shared/models/policy-filters.model';
import { DEFAULT_POLICY_SUMMARY } from '../../shared/models/policy-summary.model';
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
import {
  PolicyStatus,
  Region,
  LineOfBusiness,
  Currency,
  PolicySortField,
  SortDirection,
} from '../../shared/models/policy.enums';
import { Policy } from '../../shared/models/policy.model';

const reducer = policyFeature.reducer;

const MOCK_POLICY: Policy = {
  id: 'pol-001',
  policyNumber: 'POL-2025-001',
  policyholderName: 'Tanaka Corp',
  status: PolicyStatus.Active,
  region: Region.Japan,
  premiumAmount: 50000,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-01',
  lineOfBusiness: LineOfBusiness.Property,
  underwriter: 'Alice Wang',
  flaggedForReview: false,
  currency: Currency.JPY,
};

const MOCK_POLICY_2: Policy = {
  ...MOCK_POLICY,
  id: 'pol-002',
  policyNumber: 'POL-2025-002',
  flaggedForReview: false,
};

describe('Policy Reducer', () => {
  it('should return the initial state for an unknown action', () => {
    const state = reducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialPolicyState);
  });

  describe('loadPolicies', () => {
    it('should set loadStatus to loading and clear error', () => {
      const stateWithError = { ...initialPolicyState, error: 'Previous error', loadStatus: 'error' as const };
      const state = reducer(stateWithError, loadPolicies({
        filters: DEFAULT_POLICY_FILTERS,
        pagination: DEFAULT_PAGINATION,
        sort: DEFAULT_SORT,
      }));
      expect(state.loadStatus).toBe('loading');
      expect(state.error).toBeNull();
    });
  });

  describe('loadPoliciesSuccess', () => {
    it('should set policies, pagination and loadStatus to success', () => {
      const loadingState = { ...initialPolicyState, loadStatus: 'loading' as const };
      const pagination = { page: 1, pageSize: 25, totalItems: 210, totalPages: 9 };
      const state = reducer(loadingState, loadPoliciesSuccess({
        policies: [MOCK_POLICY],
        pagination,
      }));
      expect(state.loadStatus).toBe('success');
      expect(state.policies).toEqual([MOCK_POLICY]);
      expect(state.pagination).toEqual(pagination);
      expect(state.error).toBeNull();
    });

    it('should replace the existing policies array', () => {
      const stateWithPolicies = { ...initialPolicyState, policies: [MOCK_POLICY], loadStatus: 'loading' as const };
      const state = reducer(stateWithPolicies, loadPoliciesSuccess({
        policies: [MOCK_POLICY_2],
        pagination: DEFAULT_PAGINATION,
      }));
      expect(state.policies).toEqual([MOCK_POLICY_2]);
      expect(state.policies.length).toBe(1);
    });
  });

  describe('loadPoliciesFailure', () => {
    it('should set error and loadStatus to error', () => {
      const loadingState = { ...initialPolicyState, loadStatus: 'loading' as const };
      const state = reducer(loadingState, loadPoliciesFailure({ error: 'Network error' }));
      expect(state.loadStatus).toBe('error');
      expect(state.error).toBe('Network error');
    });
  });

  describe('loadSummarySuccess', () => {
    it('should update summaryStats without changing other state', () => {
      const summary = { ...DEFAULT_POLICY_SUMMARY, totalPolicies: 210, activePolicies: 105 };
      const state = reducer(initialPolicyState, loadSummarySuccess({ summary }));
      expect(state.summaryStats.totalPolicies).toBe(210);
      expect(state.summaryStats.activePolicies).toBe(105);
      expect(state.loadStatus).toBe('idle');
      expect(state.policies).toEqual([]);
    });
  });

  describe('updateFilters', () => {
    it('should update filters and reset pagination to defaults', () => {
      const stateOnPage3 = {
        ...initialPolicyState,
        pagination: { page: 3, pageSize: 25, totalItems: 210, totalPages: 9 },
      };
      const newFilters = { ...DEFAULT_POLICY_FILTERS, statuses: [PolicyStatus.Active] };
      const state = reducer(stateOnPage3, updateFilters({ filters: newFilters }));
      expect(state.filters.statuses).toEqual([PolicyStatus.Active]);
      expect(state.pagination).toEqual(DEFAULT_PAGINATION);
    });
  });

  describe('updatePagination', () => {
    it('should update page and pageSize while preserving totalItems', () => {
      const stateWithTotal = {
        ...initialPolicyState,
        pagination: { page: 1, pageSize: 25, totalItems: 210, totalPages: 9 },
      };
      const state = reducer(stateWithTotal, updatePagination({ page: 2, pageSize: 25 }));
      expect(state.pagination.page).toBe(2);
      expect(state.pagination.pageSize).toBe(25);
      expect(state.pagination.totalItems).toBe(210);
    });
  });

  describe('updateSort', () => {
    it('should update sort and reset pagination to page 1', () => {
      const stateOnPage3 = {
        ...initialPolicyState,
        pagination: { page: 3, pageSize: 25, totalItems: 210, totalPages: 9 },
      };
      const newSort = { field: PolicySortField.PremiumAmount, direction: SortDirection.Desc };
      const state = reducer(stateOnPage3, updateSort({ sort: newSort }));
      expect(state.sort).toEqual(newSort);
      expect(state.pagination).toEqual(DEFAULT_PAGINATION);
    });
  });

  describe('updateSelection', () => {
    it('should store only IDs from the selected policies array', () => {
      const state = reducer(initialPolicyState, updateSelection({ selectedPolicies: [MOCK_POLICY, MOCK_POLICY_2] }));
      expect(state.selectedPolicyIds).toEqual(['pol-001', 'pol-002']);
    });

    it('should replace any previous selection', () => {
      const stateWithSelection = { ...initialPolicyState, selectedPolicyIds: ['old-id'] };
      const state = reducer(stateWithSelection, updateSelection({ selectedPolicies: [MOCK_POLICY] }));
      expect(state.selectedPolicyIds).toEqual(['pol-001']);
    });
  });

  describe('clearSelection', () => {
    it('should set selectedPolicyIds to empty array', () => {
      const stateWithSelection = { ...initialPolicyState, selectedPolicyIds: ['pol-001', 'pol-002'] };
      const state = reducer(stateWithSelection, clearSelection());
      expect(state.selectedPolicyIds).toEqual([]);
    });
  });

  describe('updateBulkFlag', () => {
    it('should optimistically update flaggedForReview for matching policy IDs', () => {
      const stateWithPolicies = { ...initialPolicyState, policies: [MOCK_POLICY, MOCK_POLICY_2] };
      const state = reducer(stateWithPolicies, updateBulkFlag({ policyIds: ['pol-001'], flagStatus: true }));
      const updated = state.policies.find(p => p.id === 'pol-001');
      const untouched = state.policies.find(p => p.id === 'pol-002');
      expect(updated?.flaggedForReview).toBe(true);
      expect(untouched?.flaggedForReview).toBe(false);
    });

    it('should support unflagging (flagStatus: false)', () => {
      const flaggedPolicy = { ...MOCK_POLICY, flaggedForReview: true };
      const stateWithFlagged = { ...initialPolicyState, policies: [flaggedPolicy] };
      const state = reducer(stateWithFlagged, updateBulkFlag({ policyIds: ['pol-001'], flagStatus: false }));
      expect(state.policies[0].flaggedForReview).toBe(false);
    });

    it('should not mutate policies not in the policyIds list', () => {
      const stateWithPolicies = { ...initialPolicyState, policies: [MOCK_POLICY, MOCK_POLICY_2] };
      const state = reducer(stateWithPolicies, updateBulkFlag({ policyIds: ['pol-001'], flagStatus: true }));
      expect(state.policies[1]).toEqual(MOCK_POLICY_2);
    });
  });
});
