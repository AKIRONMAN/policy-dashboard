import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PolicyFilters, Pagination, Sort, PolicyStatus, LineOfBusiness, Region, PolicySortField, SortDirection, DEFAULT_POLICY_FILTERS, DEFAULT_PAGINATION, DEFAULT_SORT, IsoDateString } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class QueryParamsService {
  constructor(private readonly router: Router) {}

  /**
   * Serialize filters, pagination, and sort to URL query params
   */
  serializeToQueryParams(filters: PolicyFilters, pagination: Pagination, sort: Sort): Record<string, string> {
    const params: Record<string, string> = {};

    // Filters
    if (filters.search) params['search'] = filters.search;
    if (filters.statuses?.length) params['statuses'] = filters.statuses.join(',');
    if (filters.linesOfBusiness?.length) params['lob'] = filters.linesOfBusiness.join(',');
    if (filters.regions?.length) params['regions'] = filters.regions.join(',');
    if (filters.underwriter) params['underwriter'] = filters.underwriter;
    if (filters.flaggedForReview !== null && filters.flaggedForReview !== undefined) {
      params['flagged'] = String(filters.flaggedForReview);
    }
    if (filters.effectiveDateFrom) params['effectiveDateFrom'] = filters.effectiveDateFrom;
    if (filters.effectiveDateTo) params['effectiveDateTo'] = filters.effectiveDateTo;
    if (filters.expiryDateFrom) params['expiryDateFrom'] = filters.expiryDateFrom;
    if (filters.expiryDateTo) params['expiryDateTo'] = filters.expiryDateTo;

    // Pagination
    if (pagination.page !== DEFAULT_PAGINATION.page) params['page'] = String(pagination.page);
    if (pagination.pageSize !== DEFAULT_PAGINATION.pageSize) params['pageSize'] = String(pagination.pageSize);

    // Sort
    if (sort.field && sort.field !== DEFAULT_SORT.field) params['sortBy'] = sort.field;
    if (sort.direction !== DEFAULT_SORT.direction) params['sortDir'] = sort.direction.toLowerCase();

    return params;
  }

  /**
   * Deserialize URL query params to filters, pagination, and sort
   * Validates all values and falls back to defaults for invalid entries
   */
  deserializeFromQueryParams(queryParams: Record<string, string | string[]>): {
    filters: Partial<PolicyFilters>;
    pagination: Partial<Pagination>;
    sort: Partial<Sort>;
  } {
    const filters: any = {};
    const pagination: any = {};
    const sort: any = {};

    // Filters - Extract and validate
    if (queryParams['search']) {
      const search = String(queryParams['search']).trim();
      if (search.length > 0) filters.search = search;
    }

    if (queryParams['statuses']) {
      const statuses = String(queryParams['statuses']).split(',').filter(s => s.length > 0);
      const validStatuses = statuses.filter((s) => Object.values(PolicyStatus).includes(s as PolicyStatus)) as PolicyStatus[];
      if (validStatuses.length > 0) filters.statuses = validStatuses;
    }

    if (queryParams['lob']) {
      const lobs = String(queryParams['lob']).split(',').filter(l => l.length > 0);
      const validLobs = lobs.filter((l) => Object.values(LineOfBusiness).includes(l as LineOfBusiness)) as LineOfBusiness[];
      if (validLobs.length > 0) filters.linesOfBusiness = validLobs;
    }

    if (queryParams['regions']) {
      const regions = String(queryParams['regions']).split(',').filter(r => r.length > 0);
      const validRegions = regions.filter((r) => Object.values(Region).includes(r as Region)) as Region[];
      if (validRegions.length > 0) filters.regions = validRegions;
    }

    if (queryParams['underwriter']) {
      const underwriter = String(queryParams['underwriter']).trim();
      if (underwriter.length > 0) filters.underwriter = underwriter;
    }

    if (queryParams['flagged']) {
      const flagged = String(queryParams['flagged']).toLowerCase();
      if (flagged === 'true' || flagged === 'false') {
        filters.flaggedForReview = flagged === 'true';
      }
    }

    if (queryParams['effectiveDateFrom']) {
      const dateStr = String(queryParams['effectiveDateFrom']).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        filters.effectiveDateFrom = dateStr as IsoDateString;
      }
    }

    if (queryParams['effectiveDateTo']) {
      const dateStr = String(queryParams['effectiveDateTo']).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        filters.effectiveDateTo = dateStr as IsoDateString;
      }
    }

    if (queryParams['expiryDateFrom']) {
      const dateStr = String(queryParams['expiryDateFrom']).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        filters.expiryDateFrom = dateStr as IsoDateString;
      }
    }

    if (queryParams['expiryDateTo']) {
      const dateStr = String(queryParams['expiryDateTo']).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        filters.expiryDateTo = dateStr as IsoDateString;
      }
    }

    // Pagination - Validate numeric values
    if (queryParams['page']) {
      const page = parseInt(String(queryParams['page']), 10);
      if (!isNaN(page) && page >= 1) pagination.page = page;
    }

    if (queryParams['pageSize']) {
      const pageSize = parseInt(String(queryParams['pageSize']), 10);
      if (!isNaN(pageSize) && pageSize > 0) pagination.pageSize = pageSize;
    }

    // Sort - Validate field and direction
    if (queryParams['sortBy']) {
      const field = String(queryParams['sortBy']).trim();
      // Validate against PolicySortField enum values
      if (Object.values(PolicySortField).includes(field as PolicySortField)) {
        sort.field = field as Sort['field'];
      }
    }

    if (queryParams['sortDir']) {
      const dir = String(queryParams['sortDir']).toUpperCase().trim();
      if (dir === SortDirection.Asc || dir === SortDirection.Desc) {
        sort.direction = dir as Sort['direction'];
      }
    }

    return { filters, pagination, sort };
  }

  /**
   * Update browser URL with current state (without reloading)
   */
  updateQueryParams(filters: PolicyFilters, pagination: Pagination, sort: Sort): void {
    const queryParams = this.serializeToQueryParams(filters, pagination, sort);
    this.router.navigate([], {
      relativeTo: undefined,
      queryParams,
      queryParamsHandling: undefined, // Replace all params (don't merge) to properly clear empty filters
      replaceUrl: true, // Replace history instead of adding new entry
    });
  }
}
