import { Currency } from './policy.enums';

export interface PolicySummary {
  readonly totalPolicies: number;
  readonly activePolicies: number;
  readonly pendingPolicies: number;
  readonly expiredPolicies: number;
  readonly totalPremium: number;
  readonly currency: Currency;
  readonly flaggedForReview: number;
  readonly cancelledPolicies: number;
  readonly expiringSoonPolicies: number;
  readonly lobPremiumMap: Record<string, number>;
  readonly suspendedPolicies?: number;
  readonly totalPoliciesByLineOfBusiness?: Record<string, number>;
}

export const DEFAULT_POLICY_SUMMARY: PolicySummary = {
  totalPolicies: 0,
  activePolicies: 0,
  pendingPolicies: 0,
  expiredPolicies: 0,
  totalPremium: 0,
  currency: Currency.USD,
  flaggedForReview: 0,
  cancelledPolicies: 0,
  expiringSoonPolicies: 0,
  lobPremiumMap: {},
  suspendedPolicies: 0,
  totalPoliciesByLineOfBusiness: {},
};
