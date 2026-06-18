/**
 * Format large numbers with K (thousands), M (millions), B (billions) suffixes
 * 
 * Examples:
 * - 1500 → "1.5K"
 * - 2500000 → "2.5M"
 * - 3500000000 → "3.5B"
 * - 450 → "450" (no suffix for small numbers)
 * 
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with appropriate suffix
 */
export function formatCompactNumber(num: number, decimals: number = 1): string {
  if (num === 0) return '0';
  if (Math.abs(num) < 1000) return num.toString();

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const magnitude = Math.floor(Math.log10(Math.abs(num)) / 3);

  if (magnitude >= suffixes.length) {
    // For extremely large numbers, use default formatting
    return num.toExponential(2);
  }

  const scaled = num / Math.pow(1000, magnitude);
  const rounded = Math.round(scaled * Math.pow(10, decimals)) / Math.pow(10, decimals);

  return `${rounded}${suffixes[magnitude]}`;
}

/**
 * Format currency with compact notation (K, M, B)
 * 
 * Examples:
 * - (1500000, "USD") → "$1.5M"
 * - (2500000000, "EUR") → "€2.5B"
 * 
 * @param num - The number to format
 * @param currency - Currency code (USD, EUR, GBP, etc.)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted currency string with compact notation
 */
export function formatCompactCurrency(num: number, currency: string = 'USD', decimals: number = 1): string {
  const formatted = formatCompactNumber(num, decimals);

  // Map currency codes to symbols
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${formatted}`;
}
