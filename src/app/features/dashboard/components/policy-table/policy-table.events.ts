import { Pagination } from '../../../../shared/models/pagination.model';
import { Policy } from '../../../../shared/models/policy.model';
import { PolicySortField, SortDirection } from '../../../../shared/models/policy.enums';

export type PolicyTablePageChangeEvent = Pick<Pagination, 'page' | 'pageSize'>;

// field is always a real column when the user actively clicks a header to sort
export interface PolicyTableSortChangeEvent {
  readonly field: PolicySortField;
  readonly direction: SortDirection;
}

export type PolicyTableSelectionChangeEvent = readonly Policy[];
