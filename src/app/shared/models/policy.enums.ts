export enum PolicyStatus {
  Active = 'ACTIVE',
  Pending = 'PENDING',
  Expired = 'EXPIRED',
  Cancelled = 'CANCELLED',
}

export enum LineOfBusiness {
  Property = 'PROPERTY',
  Casualty = 'CASUALTY',
  AccidentHealth = 'A&H',
  Marine = 'MARINE',
}

export enum Region {
  Singapore = 'Singapore',
  HongKong = 'Hong Kong',
  Australia = 'Australia',
  Japan = 'Japan',
  Thailand = 'Thailand',
  Indonesia = 'Indonesia',
  Malaysia = 'Malaysia',
  Philippines = 'Philippines',
}

export enum Currency {
  USD = 'USD',
  SGD = 'SGD',
  HKD = 'HKD',
  AUD = 'AUD',
  JPY = 'JPY',
  THB = 'THB',
}

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export enum PolicySortField {
  PolicyNumber = 'policyNumber',
  PolicyholderName = 'policyholderName',
  LineOfBusiness = 'lineOfBusiness',
  Status = 'status',
  PremiumAmount = 'premiumAmount',
  EffectiveDate = 'effectiveDate',
  ExpiryDate = 'expiryDate',
  Region = 'region',
  Underwriter = 'underwriter',
}
