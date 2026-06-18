import { LineOfBusiness, PolicyStatus, Region } from '../../../../shared/models/policy.enums';

export interface SelectOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function enumToOptions<T extends string>(
  enumObj: Record<string, T>,
): SelectOption<T>[] {
  return Object.values(enumObj).map((value) => ({
    label: formatEnumLabel(value),
    value,
  }));
}

export const POLICY_STATUS_OPTIONS = enumToOptions(PolicyStatus);
export const REGION_OPTIONS = enumToOptions(Region);
export const LINE_OF_BUSINESS_OPTIONS = enumToOptions(LineOfBusiness);
