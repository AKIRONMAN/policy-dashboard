import { Policy } from './policy.model';
import { DEFAULT_POLICY_FILTERS, PolicyFilters } from './policy-filters.model';
import { DEFAULT_PAGINATION, Pagination } from './pagination.model';
import { DEFAULT_SORT, Sort } from './sort.model';
import { DEFAULT_POLICY_SUMMARY, PolicySummary } from './policy-summary.model';

export type PolicyLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PolicyState {
  readonly policies: readonly Policy[];
  readonly filters: PolicyFilters;
  readonly pagination: Pagination;
  readonly sort: Sort;
  readonly selectedPolicyIds: readonly string[];
  readonly loadStatus: PolicyLoadStatus;
  readonly error: string | null;
  readonly summaryStats: PolicySummary;
}

export const initialPolicyState: PolicyState = {
  policies: [],
  filters: DEFAULT_POLICY_FILTERS,
  pagination: DEFAULT_PAGINATION,
  sort: DEFAULT_SORT,
  selectedPolicyIds: [],
  loadStatus: 'idle',
  error: null,
  summaryStats: DEFAULT_POLICY_SUMMARY,
};
