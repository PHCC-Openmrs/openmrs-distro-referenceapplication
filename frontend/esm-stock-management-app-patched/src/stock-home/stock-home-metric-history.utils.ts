const SNAPSHOT_DAYS_AGO = [28, 21, 14, 7, 0];

function daysAgoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Fixed "expiring soon" window. Deliberately not the stock item's expiryNotice: the stock item form
 * stored days-until-a-picked-date there, so many items carry notices of 700+ days and flagged
 * batches expiring years out.
 */
export const EXPIRY_WINDOW_DAYS = 180;

interface ExpiringBatch {
  expiration: Date | string;
}

export function daysUntilExpiry(expiration: Date | string, asOf: Date = new Date()) {
  return Math.ceil((new Date(expiration).getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));
}

/** Expires within the window, or has already expired. */
export function isExpiringWithinWindow(batch: ExpiringBatch, asOf: Date = new Date()) {
  return daysUntilExpiry(batch.expiration, asOf) <= EXPIRY_WINDOW_DAYS;
}

/**
 * Recomputes, for each of the last 4 weeks, how many batches would have shown as an
 * "expiring soon" alert as of that date. Pure client-side recompute over already-fetched
 * batch data (expiration dates don't change), so it needs no extra API calls.
 */
export function computeExpiringStockHistory(batches: Array<ExpiringBatch>) {
  const points = SNAPSHOT_DAYS_AGO.map((daysAgo) => {
    const asOf = daysAgoDate(daysAgo);
    const count = batches.filter((batch) => isExpiringWithinWindow(batch, asOf)).length;
    return { daysAgo, count };
  });

  const latest = points[points.length - 1];
  const weekAgo = points.find((point) => point.daysAgo === 7);

  return {
    trend: latest && weekAgo ? latest.count - weekAgo.count : null,
    sparkline: points.map((point) => point.count),
  };
}

interface DisposedItem {
  operationDate: Date | string;
}

/**
 * Recomputes the cumulative disposed-stock count as of each of the last 4 weeks from
 * already-fetched disposal records (filtering by operationDate), so it needs no extra
 * API calls.
 */
export function computeDisposedStockHistory(disposedItems: Array<DisposedItem>) {
  const points = SNAPSHOT_DAYS_AGO.map((daysAgo) => {
    const asOf = daysAgoDate(daysAgo);
    const count = disposedItems.filter((item) => new Date(item.operationDate).getTime() <= asOf.getTime()).length;
    return { daysAgo, count };
  });

  const latest = points[points.length - 1];
  const weekAgo = points.find((point) => point.daysAgo === 7);

  return {
    trend: latest && weekAgo ? latest.count - weekAgo.count : null,
    sparkline: points.map((point) => point.count),
  };
}
