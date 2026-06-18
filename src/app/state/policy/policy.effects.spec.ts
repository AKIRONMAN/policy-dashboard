import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { PolicyEffects } from './policy.effects';
import { ApiService } from '../../core/services/api.service';
import {
  loadPolicies,
  loadPoliciesSuccess,
  loadPoliciesFailure,
  loadSummary,
  loadSummarySuccess,
  loadSummaryFailure,
  updateBulkFlag,
  clearSelection,
} from './policy.actions';
import { initialPolicyState } from '../../shared/models/policy-state.model';
import { DEFAULT_PAGINATION } from '../../shared/models/pagination.model';
import { DEFAULT_SORT } from '../../shared/models/sort.model';
import { DEFAULT_POLICY_FILTERS } from '../../shared/models/policy-filters.model';
import { DEFAULT_POLICY_SUMMARY } from '../../shared/models/policy-summary.model';
import { PolicyStatus, Region, LineOfBusiness, Currency } from '../../shared/models/policy.enums';
import { Policy } from '../../shared/models/policy.model';

const MOCK_POLICY: Policy = {
  id: 'pol-001',
  policyNumber: 'POL-001',
  policyholderName: 'Tanaka Corp',
  status: PolicyStatus.Active,
  region: Region.Singapore,
  premiumAmount: 50000,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-01',
  lineOfBusiness: LineOfBusiness.Property,
  underwriter: 'Alice Wang',
  flaggedForReview: false,
  currency: Currency.SGD,
};

describe('PolicyEffects', () => {
  let actions$: Observable<Action>;
  let effects: PolicyEffects;
  let apiService: jasmine.SpyObj<ApiService>;
  let store: MockStore;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['getPolicies', 'getSummary', 'bulkFlag']);

    TestBed.configureTestingModule({
      providers: [
        PolicyEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { policy: initialPolicyState } }),
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    effects = TestBed.inject(PolicyEffects);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    store = TestBed.inject(MockStore);
  });

  afterEach(() => store.resetSelectors());

  describe('loadPolicies$', () => {
    it('should dispatch loadPoliciesSuccess and loadSummary on successful API call', (done) => {
      const pagination = { page: 1, pageSize: 25, totalItems: 210, totalPages: 9 };
      apiService.getPolicies.and.returnValue(of({ policies: [MOCK_POLICY], pagination }));

      actions$ = of(loadPolicies({
        filters: DEFAULT_POLICY_FILTERS,
        pagination: DEFAULT_PAGINATION,
        sort: DEFAULT_SORT,
      }));

      const dispatched: Action[] = [];
      effects.loadPolicies$.subscribe({
        next: (action) => dispatched.push(action),
        complete: () => {
          expect(dispatched.length).toBe(2);
          expect(dispatched[0]).toEqual(loadPoliciesSuccess({ policies: [MOCK_POLICY], pagination }));
          expect(dispatched[1]).toEqual(loadSummary({ filters: DEFAULT_POLICY_FILTERS }));
          done();
        },
      });
    });

    it('should dispatch loadPoliciesFailure when API throws', (done) => {
      apiService.getPolicies.and.returnValue(throwError(() => new Error('Network error')));

      actions$ = of(loadPolicies({
        filters: DEFAULT_POLICY_FILTERS,
        pagination: DEFAULT_PAGINATION,
        sort: DEFAULT_SORT,
      }));

      effects.loadPolicies$.subscribe((action) => {
        expect(action).toEqual(loadPoliciesFailure({ error: 'Network error' }));
        done();
      });
    });
  });

  describe('loadSummary$', () => {
    it('should dispatch loadSummarySuccess on successful API call', (done) => {
      const summary = { ...DEFAULT_POLICY_SUMMARY, totalPolicies: 210 };
      apiService.getSummary.and.returnValue(of(summary));

      actions$ = of(loadSummary({ filters: DEFAULT_POLICY_FILTERS }));

      effects.loadSummary$.subscribe((action) => {
        expect(action).toEqual(loadSummarySuccess({ summary }));
        done();
      });
    });

    it('should dispatch loadSummaryFailure when API throws', (done) => {
      apiService.getSummary.and.returnValue(throwError(() => new Error('Summary failed')));

      actions$ = of(loadSummary({ filters: DEFAULT_POLICY_FILTERS }));

      effects.loadSummary$.subscribe((action) => {
        expect(action).toEqual(loadSummaryFailure({ error: 'Summary failed' }));
        done();
      });
    });
  });

  describe('flagPolicies$', () => {
    it('should call bulkFlag API and then dispatch loadPolicies', (done) => {
      apiService.bulkFlag.and.returnValue(of({ success: true, updatedCount: 1 }));

      actions$ = of(updateBulkFlag({ policyIds: ['pol-001'], flagStatus: true }));

      effects.flagPolicies$.subscribe((action) => {
        expect(apiService.bulkFlag).toHaveBeenCalledWith(['pol-001'], true);
        expect(action.type).toBe('[Policy] Load Policies');
        done();
      });
    });

    it('should dispatch loadPoliciesFailure when bulkFlag API throws', (done) => {
      apiService.bulkFlag.and.returnValue(throwError(() => new Error('Flag failed')));

      actions$ = of(updateBulkFlag({ policyIds: ['pol-001'], flagStatus: true }));

      effects.flagPolicies$.subscribe((action) => {
        expect(action).toEqual(loadPoliciesFailure({ error: 'Flag failed' }));
        done();
      });
    });
  });
});
