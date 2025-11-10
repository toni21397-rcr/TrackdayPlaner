import { parseISO } from "date-fns";

/**
 * Calculate the number of days between two dates (inclusive).
 * Uses parseISO to avoid timezone shifts.
 * 
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string (YYYY-MM-DD)
 * @returns Number of days (inclusive), minimum 1
 */
export function calculateDurationDays(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(1, durationDays);
}
