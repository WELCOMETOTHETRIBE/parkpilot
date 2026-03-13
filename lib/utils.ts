import Decimal from 'decimal.js';

/**
 * Normalize price text to a numeric decimal value
 * Handles formats like "$45.99", "45.99", "$45", etc.
 */
export function normalizePrice(priceText: string): number {
  // Remove common currency symbols, spaces, commas
  const cleaned = priceText
    .replace(/[$€£¥]/g, '')
    .replace(/,/g, '')
    .trim();

  // Extract first numeric value (may have decimals)
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match || !match[1]) {
    throw new Error(`Could not parse price from: ${priceText}`);
  }

  return parseFloat(match[1]);
}

/**
 * Parse availability text for inventory hints
 * Returns parsed inventory count if detectable, null otherwise
 */
export function parseAvailability(text: string): number | null {
  if (!text) return null;

  // Look for patterns like "12 spots left", "Only 3 remaining", etc.
  const match = text.match(/(\d+)\s*(?:spot|ticket|pass|space|item|available|left|remaining)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  // Look for "sold out", "unavailable"
  if (/sold\s*out|unavailable|no.*available/i.test(text)) {
    return 0;
  }

  return null;
}

/**
 * Format price for display
 */
export function formatPrice(price: number | Decimal, currency = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : currency;
  const num = typeof price === 'number' ? price : price.toNumber();
  return `${symbol}${num.toFixed(2)}`;
}

/**
 * Calculate margin with fees
 */
export function calculateMargin(
  buyPrice: number | Decimal,
  sellPrice: number | Decimal,
  fees: number | Decimal = 0
): Decimal {
  const buy = new Decimal(buyPrice);
  const sell = new Decimal(sellPrice);
  const fee = new Decimal(fees);
  return sell.minus(buy).minus(fee);
}

/**
 * Calculate margin percentage
 */
export function calculateMarginPercent(
  buyPrice: number | Decimal,
  sellPrice: number | Decimal,
  fees: number | Decimal = 0
): number {
  const margin = calculateMargin(buyPrice, sellPrice, fees);
  const buy = new Decimal(buyPrice);
  if (buy.isZero()) return 0;
  return margin.div(buy).times(100).toNumber();
}

/**
 * Slug-ify a string for URLs
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Retry helper for async operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Deep clone an object (simple serialization-based approach)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safe JSON stringify with circular reference protection
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | string, includeTime = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr} ${timeStr}`;
}
