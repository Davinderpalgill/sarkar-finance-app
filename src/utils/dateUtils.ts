import { format, formatDistanceToNow, differenceInDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';

export function formatDate(epochMs: number, pattern = 'dd MMM yyyy'): string {
  return format(new Date(epochMs), pattern);
}

export function formatDateTime(epochMs: number): string {
  return format(new Date(epochMs), 'dd MMM yyyy, hh:mm a');
}

export function timeAgo(epochMs: number): string {
  return formatDistanceToNow(new Date(epochMs), { addSuffix: true });
}

export function daysUntil(epochMs: number): number {
  return differenceInDays(new Date(epochMs), new Date());
}

export function addMonth(epochMs: number, months = 1): number {
  return addMonths(new Date(epochMs), months).getTime();
}

export function currentMonthRange(): { from: number; to: number } {
  const now = new Date();
  return {
    from: startOfMonth(now).getTime(),
    to:   endOfMonth(now).getTime(),
  };
}

export function epochMsFromDate(date: Date): number {
  return date.getTime();
}
