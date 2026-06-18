import { Currency, LineOfBusiness, PolicyStatus, Region } from './policy.enums';

/** ISO 8601 calendar date (YYYY-MM-DD). */
export type IsoDateString = `${number}-${number}-${number}`;

export interface Policy {
  readonly id: string;
  readonly policyNumber: string;
  readonly policyholderName: string;
  readonly lineOfBusiness: LineOfBusiness;
  readonly status: PolicyStatus;
  readonly premiumAmount: number;
  readonly currency: Currency;
  readonly effectiveDate: IsoDateString;
  readonly expiryDate: IsoDateString;
  readonly region: Region;
  readonly underwriter: string;
  readonly flaggedForReview: boolean;
}
