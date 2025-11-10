import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isSameMonth, isSameDay, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "";
  }

  // Single-day event
  if (isSameDay(start, end)) {
    return format(start, "MMM d");
  }

  // Multi-day event in same month
  if (isSameMonth(start, end)) {
    return `${format(start, "MMM d")}-${format(end, "d")}`;
  }

  // Multi-day event spanning months
  return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
}
