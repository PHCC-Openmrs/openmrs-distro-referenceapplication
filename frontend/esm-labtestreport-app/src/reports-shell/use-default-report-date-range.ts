import { useState } from 'react';
import { getDefaultReportDateRange } from './date-utils';

/** The default report date range, computed once per mount so it stays stable across re-renders. */
export function useDefaultReportDateRange() {
  const [range] = useState(getDefaultReportDateRange);
  return range;
}
