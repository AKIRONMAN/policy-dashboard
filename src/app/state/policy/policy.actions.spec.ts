import * as PolicyActions from './policy.actions';
import { DEFAULT_POLICY_FILTERS } from '../../shared/models/policy-filters.model';
import { DEFAULT_PAGINATION } from '../../shared/models/pagination.model';
import { DEFAULT_SORT } from '../../shared/models/sort.model';
import {
  PolicyStatus,
  Region,
  LineOfBusiness,
  Currency,
  PolicySortField,
  SortDirection,
} from '../../shared/models/policy.enums';
import { DEFAULT_POLICY_SUMMARY } from '../../shared/models/policy-summary.model';
import { Policy } from '../../shared/models/policy.model';

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

describe('Policy Actions', () => {
  describe('loadPolicies', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadPolicies({
        filters: DEFAULT_POLICY_FILTERS,
        pagination: DEFAULT_PAGINATION,
        sort: DEFAULT_SORT,
      });
      expect(action.type).toBe('[Policy] Load Policies');
    });

    it('should carry filters, pagination, and sort as payload', () => {
      const sort = { field: PolicySortField.PolicyNumber, direction: SortDirection.Asc };
      const action = PolicyActions.loadPolicies({
        filters: DEFAULT_POLICY_FILTERS,
        pagination: DEFAULT_PAGINATION,
        sort,
      });
      expect(action.filters).toEqual(DEFAULT_POLICY_FILTERS);
      expect(action.pagination).toEqual(DEFAULT_PAGINATION);
      expect(action.sort).toEqual(sort);
    });
  });

  describe('loadPoliciesSuccess', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadPoliciesSuccess({
        policies: [MOCK_POLICY],
        pagination: DEFAULT_PAGINATION,
      });
      expect(action.type).toBe('[Policy] Load Policies Success');
    });

    it('should carry the policies array and updated pagination', () => {
      const pagination = { page: 2, pageSize: 25, totalItems: 210, totalPages: 9 };
      const action = PolicyActions.loadPoliciesSuccess({
        policies: [MOCK_POLICY],
        pagination,
      });
      expect(action.policies).toEqual([MOCK_POLICY]);
      expect(action.pagination).toEqual(pagination);
    });
  });

  describe('loadPoliciesFailure', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadPoliciesFailure({ error: 'Network error' });
      expect(action.type).toBe('[Policy] Load Policies Failure');
    });

    it('should carry the error message', () => {
      const action = PolicyActions.loadPoliciesFailure({ error: 'Timeout' });
      expect(action.error).toBe('Timeout');
    });
  });

  describe('updateFilters', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.updateFilters({ filters: DEFAULT_POLICY_FILTERS });
      expect(action.type).toBe('[Policy] Update Filters');
    });

    it('should carry the new filters', () => {
      const filters = {
        ...DEFAULT_POLICY_FILTERS,
        statuses: [PolicyStatus.Active, PolicyStatus.Pending],
        regions: [Region.Singapore],
      };
      const action = PolicyActions.updateFilters({ filters });
      expect(action.filters.statuses).toEqual([PolicyStatus.Active, PolicyStatus.Pending]);
      expect(action.filters.regions).toEqual([Region.Singapore]);
    });
  });

  describe('updateSort', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.updateSort({
        sort: { field: PolicySortField.PremiumAmount, direction: SortDirection.Desc },
      });
      expect(action.type).toBe('[Policy] Update Sort');
    });

    it('should carry the sort payload', () => {
      const sort = { field: PolicySortField.ExpiryDate, direction: SortDirection.Asc };
      const action = PolicyActions.updateSort({ sort });
      expect(action.sort).toEqual(sort);
    });
  });

  describe('updatePagination', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.updatePagination({ page: 2, pageSize: 25 });
      expect(action.type).toBe('[Policy] Update Pagination');
    });

    it('should carry page and pageSize', () => {
      const action = PolicyActions.updatePagination({ page: 3, pageSize: 50 });
      expect(action.page).toBe(3);
      expect(action.pageSize).toBe(50);
    });
  });

  describe('updateSelection', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.updateSelection({ selectedPolicies: [MOCK_POLICY] });
      expect(action.type).toBe('[Policy] Update Selection');
    });

    it('should carry the selected policies array', () => {
      const action = PolicyActions.updateSelection({ selectedPolicies: [MOCK_POLICY] });
      expect(action.selectedPolicies).toEqual([MOCK_POLICY]);
    });
  });

  describe('clearSelection', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.clearSelection();
      expect(action.type).toBe('[Policy] Clear Selection');
    });
  });

  describe('updateBulkFlag', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.updateBulkFlag({ policyIds: ['pol-001'], flagStatus: true });
      expect(action.type).toBe('[Policy] Update Bulk Flag');
    });

    it('should carry policyIds and flagStatus', () => {
      const action = PolicyActions.updateBulkFlag({
        policyIds: ['pol-001', 'pol-002'],
        flagStatus: false,
      });
      expect(action.policyIds).toEqual(['pol-001', 'pol-002']);
      expect(action.flagStatus).toBe(false);
    });
  });

  describe('loadSummary', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadSummary({ filters: DEFAULT_POLICY_FILTERS });
      expect(action.type).toBe('[Policy] Load Summary');
    });
  });

  describe('loadSummarySuccess', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadSummarySuccess({ summary: DEFAULT_POLICY_SUMMARY });
      expect(action.type).toBe('[Policy] Load Summary Success');
    });

    it('should carry the summary payload', () => {
      const summary = { ...DEFAULT_POLICY_SUMMARY, totalPolicies: 210, activePolicies: 105 };
      const action = PolicyActions.loadSummarySuccess({ summary });
      expect(action.summary.totalPolicies).toBe(210);
      expect(action.summary.activePolicies).toBe(105);
    });
  });

  describe('loadSummaryFailure', () => {
    it('should create the action with the correct type', () => {
      const action = PolicyActions.loadSummaryFailure({ error: 'Summary failed' });
      expect(action.type).toBe('[Policy] Load Summary Failure');
    });
  });
});
