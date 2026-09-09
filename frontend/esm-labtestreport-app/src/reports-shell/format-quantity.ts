// Quantities come off every stock report in the item's dispensing unit ("Tablet", "Bottle"), which
// is the unit stock actually moves in but not the unit a storekeeper counts a shelf in. Rendering
// the bulk/procurement pack first and the dispensing figure in brackets gives both readings at
// once - "92 Box (2,760 Tablet)" - without changing what the number means.

/** At most two decimals, trailing zeros trimmed, with thousands separators: 2760 -> "2,760". */
function formatNumber(value: number): string {
  // Round before formatting: dividing a dispensing quantity by a pack factor routinely lands on
  // 18.199999999999996, and toLocaleString's own maximumFractionDigits would render that as
  // "18.2" while a raw String() elsewhere would not - so normalise the value itself.
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Renders a dispensing-unit quantity, expressed in the item's bulk pack where it has one.
 *
 * Falls back to the plain "2,760 Tablet" form when the item has no bulk pack configured, or when
 * the pack holds a single dispensing unit (a Box of one Bottle), where "5 Box (5 Bottle)" would say
 * the same thing twice. A pack figure that is not a whole number is kept as one - 546 Tablet at 30
 * to a Box reads "18.2 Box (546 Tablet)", which is the honest answer for a part-used pack.
 */
export function formatQuantity(
  value: number,
  unitName: string | null | undefined,
  bulkUnitName?: string | null,
  bulkFactor?: number | null,
): string {
  const base = unitName ? `${formatNumber(value)} ${unitName}` : formatNumber(value);
  if (!bulkUnitName || !bulkFactor || bulkFactor <= 1) {
    return base;
  }
  return `${formatNumber(value / bulkFactor)} ${bulkUnitName} (${base})`;
}

/**
 * The two columns the spreadsheet exports carry instead of a pre-divided pack figure, so their
 * quantity columns stay numeric and summable while still letting a reader convert to packs.
 * Empty strings rather than zeros for an item with no bulk pack, so nothing reads as "0 per pack".
 */
export function bulkExportCells(
  bulkUnitName: string | null | undefined,
  bulkFactor: number | null | undefined,
): [string, number | string] {
  return bulkUnitName && bulkFactor && bulkFactor > 1 ? [bulkUnitName, bulkFactor] : ['', ''];
}
