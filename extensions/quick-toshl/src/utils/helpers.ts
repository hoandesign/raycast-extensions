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
 * Format amount for display with Vietnamese-friendly shortcuts.
 */
export function formatDisplayAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000000) {
    return `${(absAmount / 1000000).toFixed(1)} triệu ${currency}`;
  }
  if (absAmount >= 1000) {
    return `${(absAmount / 1000).toFixed(0)}k ${currency}`;
  }
  return `${absAmount} ${currency}`;
}
