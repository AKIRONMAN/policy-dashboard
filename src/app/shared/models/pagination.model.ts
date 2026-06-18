export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};
