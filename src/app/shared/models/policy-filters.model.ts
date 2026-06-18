import { LineOfBusiness, PolicyStatus, Region } from './policy.enums';
import { IsoDateString } from './policy.model';

export interface PolicyFilters {
  readonly search: string;
  readonly statuses: readonly PolicyStatus[];
  readonly linesOfBusiness: readonly LineOfBusiness[];
  readonly regions: readonly Region[];
  readonly underwriter: string;
  readonly flaggedForReview: boolean | null;
  readonly effectiveDateFrom: IsoDateString | null;
  readonly effectiveDateTo: IsoDateString | null;
  readonly expiryDateFrom: IsoDateString | null;
  readonly expiryDateTo: IsoDateString | null;
}

export const DEFAULT_POLICY_FILTERS: PolicyFilters = {
  search: '',
  statuses: [],
  linesOfBusiness: [],
  regions: [],
  underwriter: '',
  flaggedForReview: null,
  effectiveDateFrom: null,
  effectiveDateTo: null,
  expiryDateFrom: null,
  expiryDateTo: null,
};
