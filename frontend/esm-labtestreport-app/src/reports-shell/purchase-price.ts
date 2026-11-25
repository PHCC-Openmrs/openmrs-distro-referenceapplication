// Purchase prices on the stock reports. The backend hands every price over per dispensing unit (the
// unit quantities are in), already divided down from the pack it was entered against - "100 per Box
// of 30" arrives as 3.3333 - so a value is always quantity x unit price, whatever the item's packs.

/** The two prices a batch can carry - see queries/stock_batch_balance.sql. */
export interface BatchPriceFields {
  // Typed on the Opening Stock / Receipt line that brought the batch in.
  batchUnitPrice: number | null;
  // The stock item's default purchase price.
  itemUnitPrice: number | null;
}

export type PriceSource = 'batch' | 'item';

export interface ResolvedPrice {
  unitPrice: number;
  source: PriceSource;
}

/** The batch's own price, else the item's default, else null when neither was ever entered. */
export function resolveUnitPrice(row: BatchPriceFields): ResolvedPrice | null {
  if (row.batchUnitPrice !== null && row.batchUnitPrice !== undefined) {
    return { unitPrice: row.batchUnitPrice, source: 'batch' };
  }
  if (row.itemUnitPrice !== null && row.itemUnitPrice !== undefined) {
    return { unitPrice: row.itemUnitPrice, source: 'item' };
  }
  return null;
}

/** A money amount: always two decimals, with thousands separators - 1234.5 -> "1,234.50". */
export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * A unit price keeps up to four decimals: dividing a pack price down to one tablet routinely lands
 * below a cent ("1.25 per Bag of 100" is 0.0125 a gram), and rounding that to 0.01 would be wrong by
 * a fifth on every row it multiplies.
 */
function formatUnitAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * "3.3333 / Tablet (100.00 / Box)": the per-unit price, then the same price for the item's bulk pack
 * when it has one - the same unit-then-pack reading as reports-shell/format-quantity.
 */
export function formatUnitPrice(
  unitPrice: number,
  unitName: string | null | undefined,
  bulkUnitName?: string | null,
  bulkFactor?: number | null,
): string {
  const base = unitName ? `${formatUnitAmount(unitPrice)} / ${unitName}` : formatUnitAmount(unitPrice);
  if (!bulkUnitName || !bulkFactor || bulkFactor <= 1) {
    return base;
  }
  return `${base} (${formatMoney(unitPrice * bulkFactor)} / ${bulkUnitName})`;
}

/** The raw text of the two price filter boxes, so a half-typed "1." is not thrown away. */
export interface PriceRange {
  min: string;
  max: string;
}

export const EMPTY_PRICE_RANGE: PriceRange = { min: '', max: '' };

function parseBound(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isPriceRangeActive(range: PriceRange): boolean {
  return parseBound(range.min) !== null || parseBound(range.max) !== null;
}

/**
 * Whether a unit price falls inside the range, both ends inclusive. With either end set, a row that
 * has no price does not match: asking for prices between 1 and 5 is asking for rows that have one.
 */
export function matchesPriceRange(unitPrice: number | null | undefined, range: PriceRange): boolean {
  const min = parseBound(range.min);
  const max = parseBound(range.max);
  if (min === null && max === null) {
    return true;
  }
  if (unitPrice === null || unitPrice === undefined) {
    return false;
  }
  // Compare at the four decimals the price is shown with, so typing the figure on screen matches it.
  const shown = Math.round(unitPrice * 10000) / 10000;
  return (min === null || shown >= min) && (max === null || shown <= max);
}
