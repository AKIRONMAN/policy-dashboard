import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
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
import { Policy } from '../../shared/models/policy.model';
import { DEFAULT_POLICY_SUMMARY } from '../../shared/models/policy-summary.model';

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

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getPolicies', () => {
    it('should GET /policies and map the API response shape to Angular model shape', () => {
      const apiResponse = {
        data: [MOCK_POLICY],
        pagination: { page: 1, limit: 25, total: 210, totalPages: 9 },
      };

      let result: any;
      service.getPolicies(DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe(r => result = r);

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);

      expect(result.policies).toEqual([MOCK_POLICY]);
      expect(result.pagination.pageSize).toBe(25);
      expect(result.pagination.totalItems).toBe(210);
      expect(result.pagination.totalPages).toBe(9);
    });

    it('should include search param when filter has a search value', () => {
      const filters = { ...DEFAULT_POLICY_FILTERS, search: 'tanaka' };
      service.getPolicies(filters, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('search')).toBe('tanaka');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should include comma-separated status param when statuses are set', () => {
      const filters = { ...DEFAULT_POLICY_FILTERS, statuses: [PolicyStatus.Active, PolicyStatus.Pending] };
      service.getPolicies(filters, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('status')).toBe('ACTIVE,PENDING');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should include comma-separated region param when regions are set', () => {
      const filters = { ...DEFAULT_POLICY_FILTERS, regions: [Region.Singapore, Region.Japan] };
      service.getPolicies(filters, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('region')).toBe('Singapore,Japan');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should NOT include sortField/sortOrder params when sort.field is null', () => {
      service.getPolicies(DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.has('sortField')).toBeFalse();
      expect(req.request.params.has('sortOrder')).toBeFalse();
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should include sortField and sortOrder when sort.field is set', () => {
      const sort = { field: PolicySortField.PremiumAmount, direction: SortDirection.Desc };
      service.getPolicies(DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, sort).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('sortField')).toBe('premiumAmount');
      expect(req.request.params.get('sortOrder')).toBe('DESC');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should include page and limit params from pagination', () => {
      const pagination = { page: 3, pageSize: 25, totalItems: 210, totalPages: 9 };
      service.getPolicies(DEFAULT_POLICY_FILTERS, pagination, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('limit')).toBe('25');
      req.flush({ data: [], pagination: { page: 3, limit: 25, total: 210, totalPages: 9 } });
    });

    it('should include flagged param when flaggedForReview is set', () => {
      const filters = { ...DEFAULT_POLICY_FILTERS, flaggedForReview: true };
      service.getPolicies(filters, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('flagged')).toBe('true');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should NOT include flagged param when flaggedForReview is null', () => {
      service.getPolicies(DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.has('flagged')).toBeFalse();
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });

    it('should include date range params when set', () => {
      const filters = {
        ...DEFAULT_POLICY_FILTERS,
        effectiveDateFrom: '2025-01-01' as const,
        effectiveDateTo: '2025-12-31' as const,
      };
      service.getPolicies(filters, DEFAULT_PAGINATION, DEFAULT_SORT).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies');
      expect(req.request.params.get('effectiveDateFrom')).toBe('2025-01-01');
      expect(req.request.params.get('effectiveDateTo')).toBe('2025-12-31');
      req.flush({ data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } });
    });
  });

  describe('getSummary', () => {
    it('should GET /policies/summary', () => {
      service.getSummary(DEFAULT_POLICY_FILTERS).subscribe();
      const req = httpMock.expectOne(r => r.url === '/policies/summary');
      expect(req.request.method).toBe('GET');
      req.flush(DEFAULT_POLICY_SUMMARY);
    });

    it('should include filter params but no pagination params', () => {
      const filters = { ...DEFAULT_POLICY_FILTERS, statuses: [PolicyStatus.Active] };
      service.getSummary(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/policies/summary');
      expect(req.request.params.get('status')).toBe('ACTIVE');
      expect(req.request.params.has('page')).toBeFalse();
      expect(req.request.params.has('limit')).toBeFalse();
      req.flush(DEFAULT_POLICY_SUMMARY);
    });
  });

  describe('bulkFlag', () => {
    it('should PATCH /policies/bulk-flag with policyIds and flagged in the body', () => {
      service.bulkFlag(['pol-001', 'pol-002'], true).subscribe();

      const req = httpMock.expectOne('/policies/bulk-flag');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ policyIds: ['pol-001', 'pol-002'], flagged: true });
      req.flush({ success: true, updatedCount: 2 });
    });

    it('should support unflagging (flagged: false)', () => {
      service.bulkFlag(['pol-001'], false).subscribe();

      const req = httpMock.expectOne('/policies/bulk-flag');
      expect(req.request.body.flagged).toBe(false);
      req.flush({ success: true, updatedCount: 1 });
    });
  });
});
