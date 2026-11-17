export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthString(): string {
  return getTodayDateString().slice(0, 7);
}

export function getDateDaysAgoString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampToToday(value: string): string {
  if (!value) {
    return value;
  }
  const today = getTodayDateString();
  return value > today ? today : value;
}

export function clampToCurrentMonth(value: string): string {
  if (!value) {
    return value;
  }
  const currentMonth = getCurrentMonthString();
  return value > currentMonth ? currentMonth : value;
}

/**
 * Reports open on this many days (ending today) instead of the whole history, so the first load
 * stays quick as data grows. Users widen or clear the range when they need more.
 */
export const DEFAULT_REPORT_RANGE_DAYS = 30;

export function getDefaultReportDateRange(): { startDate: string; endDate: string } {
  return { startDate: getDateDaysAgoString(DEFAULT_REPORT_RANGE_DAYS - 1), endDate: getTodayDateString() };
}
