import { selectLoading, selectPoliciesByIds } from './policy.selectors';
import { initialPolicyState } from '../../shared/models/policy-state.model';
import { PolicyStatus, Region, LineOfBusiness, Currency } from '../../shared/models/policy.enums';
import { Policy } from '../../shared/models/policy.model';

const MOCK_POLICY_A: Policy = {
  id: 'pol-001',
  policyNumber: 'POL-001',
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

const MOCK_POLICY_B: Policy = {
  ...MOCK_POLICY_A,
  id: 'pol-002',
  policyNumber: 'POL-002',
};

const MOCK_POLICY_C: Policy = {
  ...MOCK_POLICY_A,
  id: 'pol-003',
  policyNumber: 'POL-003',
};

describe('Policy Selectors', () => {
  describe('selectLoading', () => {
    it('should return true when loadStatus is "loading"', () => {
      const state = { policy: { ...initialPolicyState, loadStatus: 'loading' as const } };
      expect(selectLoading(state as any)).toBe(true);
    });

    it('should return false when loadStatus is "success"', () => {
      const state = { policy: { ...initialPolicyState, loadStatus: 'success' as const } };
      expect(selectLoading(state as any)).toBe(false);
    });

    it('should return false when loadStatus is "idle"', () => {
      const state = { policy: { ...initialPolicyState, loadStatus: 'idle' as const } };
      expect(selectLoading(state as any)).toBe(false);
    });

    it('should return false when loadStatus is "error"', () => {
      const state = { policy: { ...initialPolicyState, loadStatus: 'error' as const } };
      expect(selectLoading(state as any)).toBe(false);
    });
  });

  describe('selectPoliciesByIds', () => {
    it('should return only the policies whose IDs are in selectedPolicyIds', () => {
      const state = {
        policy: {
          ...initialPolicyState,
          policies: [MOCK_POLICY_A, MOCK_POLICY_B, MOCK_POLICY_C],
          selectedPolicyIds: ['pol-001', 'pol-003'],
        },
      };
      const result = selectPoliciesByIds(state as any);
      expect(result.length).toBe(2);
      expect(result.map(p => p.id)).toEqual(['pol-001', 'pol-003']);
    });

    it('should return an empty array when no policies are selected', () => {
      const state = {
        policy: {
          ...initialPolicyState,
          policies: [MOCK_POLICY_A, MOCK_POLICY_B],
          selectedPolicyIds: [],
        },
      };
      const result = selectPoliciesByIds(state as any);
      expect(result).toEqual([]);
    });

    it('should return an empty array when policies list is empty', () => {
      const state = {
        policy: {
          ...initialPolicyState,
          policies: [],
          selectedPolicyIds: ['pol-001'],
        },
      };
      const result = selectPoliciesByIds(state as any);
      expect(result).toEqual([]);
    });

    it('should handle selectedPolicyIds that reference non-existent policies gracefully', () => {
      const state = {
        policy: {
          ...initialPolicyState,
          policies: [MOCK_POLICY_A],
          selectedPolicyIds: ['pol-001', 'pol-999'],
        },
      };
      const result = selectPoliciesByIds(state as any);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('pol-001');
    });
  });
});
