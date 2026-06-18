import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Policy,
  PolicyFilters,
  Pagination,
  Sort,
  PolicySummary,
} from '../../shared/models';

interface ApiPoliciesResponse {
  data: Policy[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BulkFlagResponse {
  success: boolean;
  updatedCount: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/policies';

  constructor(private readonly http: HttpClient) {}

  getPolicies(
    filters: PolicyFilters,
    pagination: Pagination,
    sort: Sort
  ): Observable<{ policies: Policy[]; pagination: Pagination }> {
    const params = this.buildParams(filters, pagination, sort);
    return this.http
      .get<ApiPoliciesResponse>(this.baseUrl, { params })
      .pipe(
        map((res) => ({
          policies: res.data,
          pagination: {
            page: res.pagination.page,
            pageSize: res.pagination.limit,
            totalItems: res.pagination.total,
            totalPages: res.pagination.totalPages,
          },
        }))
      );
  }

  getSummary(filters: PolicyFilters): Observable<PolicySummary> {
    const params = this.buildParams(filters);
    return this.http.get<PolicySummary>(`${this.baseUrl}/summary`, { params });
  }

  bulkFlag(
    policyIds: string[],
    flagged: boolean
  ): Observable<BulkFlagResponse> {
    return this.http.patch<BulkFlagResponse>(`${this.baseUrl}/bulk-flag`, {
      policyIds,
      flagged,
    });
  }

  private buildParams(
    filters: PolicyFilters,
    pagination?: Pagination,
    sort?: Sort
  ): HttpParams {
    let params = new HttpParams();

    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.statuses.length > 0) {
      params = params.set('status', filters.statuses.join(','));
    }
    if (filters.linesOfBusiness.length > 0) {
      params = params.set('lineOfBusiness', filters.linesOfBusiness.join(','));
    }
    if (filters.regions.length > 0) {
      params = params.set('region', filters.regions.join(','));
    }
    if (filters.underwriter) {
      params = params.set('underwriter', filters.underwriter);
    }
    if (filters.flaggedForReview !== null) {
      params = params.set('flagged', String(filters.flaggedForReview));
    }
    if (filters.effectiveDateFrom) {
      params = params.set('effectiveDateFrom', filters.effectiveDateFrom);
    }
    if (filters.effectiveDateTo) {
      params = params.set('effectiveDateTo', filters.effectiveDateTo);
    }
    if (filters.expiryDateFrom) {
      params = params.set('expiryDateFrom', filters.expiryDateFrom);
    }
    if (filters.expiryDateTo) {
      params = params.set('expiryDateTo', filters.expiryDateTo);
    }

    if (pagination) {
      params = params.set('page', String(pagination.page));
      params = params.set('limit', String(pagination.pageSize));
    }

    if (sort?.field) {
      params = params.set('sortField', sort.field);
      params = params.set('sortOrder', sort.direction);
    }

    return params;
  }
}
