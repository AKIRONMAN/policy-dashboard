import { Pipe, PipeTransform } from '@angular/core';
import { formatCompactNumber, formatCompactCurrency } from '../utils/number-formatter';

/**
 * Format compact numbers with K, M, B suffixes
 * 
 * Usage in template:
 * - {{ 1500000 | compactNumber }}                  → "1.5M"
 * - {{ 2500000000 | compactNumber: 2 }}           → "2.50B"
 * - {{ amount | compactCurrency: 'USD' }}         → "$1.5M"
 * - {{ amount | compactCurrency: 'EUR': 2 }}      → "€2.50M"
 */
@Pipe({
  name: 'compactNumber',
  standalone: true,
})
export class CompactNumberPipe implements PipeTransform {
  /**
   * Transform number to compact format
   * @param value - Number to format
   * @param decimals - Optional number of decimal places (default: 1)
   */
  transform(value: number | null | undefined, decimals: number = 1): string {
    if (value === null || value === undefined) return '0';
    return formatCompactNumber(value, decimals);
  }
}

/**
 * Format compact currency with symbol
 */
@Pipe({
  name: 'compactCurrency',
  standalone: true,
})
export class CompactCurrencyPipe implements PipeTransform {
  /**
   * Transform number to compact currency format
   * @param value - Amount to format
   * @param currency - Currency code (USD, EUR, GBP, etc.)
   * @param decimals - Optional number of decimal places (default: 1)
   */
  transform(value: number | null | undefined, currency: string = 'USD', decimals: number = 1): string {
    if (value === null || value === undefined) return '0';
    return formatCompactCurrency(value, currency, decimals);
  }
}
