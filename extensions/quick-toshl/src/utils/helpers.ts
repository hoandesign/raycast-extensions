import { format, subDays } from "date-fns";

/**
 * Standardized AI instructions for tool responses.
 * Ensures consistent language matching across all tools.
 */
export const AI_INSTRUCTIONS =
  "IMPORTANT: Respond in the SAME LANGUAGE as the user's query. If the user asked in Vietnamese, respond in Vietnamese. If they asked in English, respond in English. Format currency amounts with proper separators.";

/**
 * Parse amount string with Vietnamese shortcuts.
 * Supports: '50k', '3 triệu', '3tr', '1.5tr', or plain numbers.
 */
export function parseAmount(input: string): number {
  const str = input.toString().toLowerCase().trim();

  // Check for Vietnamese million shortcuts
  if (str.includes("triệu") || str.includes("trieu") || str.includes("tr")) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));
    return num * 1000000;
  }
  // Check for thousand shortcut
  if (str.includes("k")) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));
    return num * 1000;
  }
  // Plain number
  return parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
}

/**
 * Parse date string with flexible formats.
 * Supports: 'today', 'yesterday', 'hôm nay', 'hôm qua', 'DD/MM', 'DD/MM/YYYY'.
 * Defaults to today if no valid date found.
 */
export function parseDate(input?: string): string {
  if (!input) return format(new Date(), "yyyy-MM-dd");

  const lower = input.toLowerCase().trim();
  const today = new Date();

  // Vietnamese and English keywords
  if (lower === "today" || lower === "hôm nay") return format(today, "yyyy-MM-dd");
  if (lower === "yesterday" || lower === "hôm qua") return format(subDays(today, 1), "yyyy-MM-dd");

  // DD/MM format (current year)
  const ddMmMatch = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (ddMmMatch) {
    const day = parseInt(ddMmMatch[1]);
    const month = parseInt(ddMmMatch[2]);
    return `${today.getFullYear()}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  // DD/MM/YYYY format
  const ddMmYyyyMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyyMatch) {
    const day = parseInt(ddMmYyyyMatch[1]);
    const month = parseInt(ddMmYyyyMatch[2]);
    const year = parseInt(ddMmYyyyMatch[3]);
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  // Default to today
  return format(today, "yyyy-MM-dd");
}

/**
 * Currency symbol map for common currencies.
 * Symbol position: true = prefix (e.g., $100), false = suffix (e.g., 100€)
 */
export const CURRENCY_SYMBOLS: Record<string, { symbol: string; prefix: boolean }> = {
  // Major currencies
  USD: { symbol: "$", prefix: true },
  EUR: { symbol: "€", prefix: false },
  GBP: { symbol: "£", prefix: true },
  JPY: { symbol: "¥", prefix: true },
  CNY: { symbol: "¥", prefix: true },
  CHF: { symbol: "CHF", prefix: true },

  // Southeast Asia
  VND: { symbol: "₫", prefix: false },
  THB: { symbol: "฿", prefix: true },
  SGD: { symbol: "S$", prefix: true },
  MYR: { symbol: "RM", prefix: true },
  IDR: { symbol: "Rp", prefix: true },
  PHP: { symbol: "₱", prefix: true },

  // Other Asia
  KRW: { symbol: "₩", prefix: true },
  INR: { symbol: "₹", prefix: true },
  HKD: { symbol: "HK$", prefix: true },
  TWD: { symbol: "NT$", prefix: true },

  // Americas
  CAD: { symbol: "C$", prefix: true },
  MXN: { symbol: "MX$", prefix: true },
  BRL: { symbol: "R$", prefix: true },
  ARS: { symbol: "AR$", prefix: true },
  COP: { symbol: "COL$", prefix: true },

  // Oceania
  AUD: { symbol: "A$", prefix: true },
  NZD: { symbol: "NZ$", prefix: true },

  // Europe
  PLN: { symbol: "zł", prefix: false },
  CZK: { symbol: "Kč", prefix: false },
  SEK: { symbol: "kr", prefix: false },
  NOK: { symbol: "kr", prefix: false },
  DKK: { symbol: "kr", prefix: false },
  HUF: { symbol: "Ft", prefix: false },
  RON: { symbol: "lei", prefix: false },
  RUB: { symbol: "₽", prefix: false },
  UAH: { symbol: "₴", prefix: false },
  TRY: { symbol: "₺", prefix: true },

  // Middle East & Africa
  AED: { symbol: "د.إ", prefix: true },
  SAR: { symbol: "﷼", prefix: true },
  ILS: { symbol: "₪", prefix: true },
  ZAR: { symbol: "R", prefix: true },
  EGP: { symbol: "E£", prefix: true },
  NGN: { symbol: "₦", prefix: true },
};

/**
 * Format currency amount with symbol (e.g., $13 instead of 13 USD).
 * For unknown currencies, falls back to suffix format (e.g., 13 XYZ).
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const absAmount = Math.abs(amount);
  const formattedAmount = absAmount.toLocaleString();
  const currencyInfo = CURRENCY_SYMBOLS[currencyCode];

  if (currencyInfo) {
    return currencyInfo.prefix
      ? `${currencyInfo.symbol}${formattedAmount}`
      : `${formattedAmount}${currencyInfo.symbol}`;
  }

  // Fallback: use currency code as suffix
  return `${formattedAmount} ${currencyCode}`;
}

/**
 * Format amount for display with Vietnamese-friendly shortcuts.
 * Uses currency symbols instead of codes.
 */
export function formatDisplayAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  const currencyInfo = CURRENCY_SYMBOLS[currency];
  const symbol = currencyInfo?.symbol || currency;
  const prefix = currencyInfo?.prefix ?? false;

  if (absAmount >= 1000000) {
    const value = `${(absAmount / 1000000).toFixed(1)} triệu`;
    return prefix ? `${symbol}${value}` : `${value}${symbol}`;
  }
  if (absAmount >= 1000) {
    const value = `${(absAmount / 1000).toFixed(0)}k`;
    return prefix ? `${symbol}${value}` : `${value}${symbol}`;
  }

  return formatCurrency(absAmount, currency);
}
