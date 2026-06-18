import { PolicySortField, SortDirection } from './policy.enums';

export interface Sort {
  readonly field: PolicySortField | null;
  readonly direction: SortDirection;
}

export const DEFAULT_SORT: Sort = {
  field: null,
  direction: SortDirection.Asc,
};
