import { useMemo } from 'react';

export interface ItemLocationRow {
  itemName: string;
  locationName?: string | null;
}

/**
 * Shared item-name filter + global text search (matches item or location name) used across the
 * stock reports, so "search by item or location" behaves identically everywhere.
 */
export function filterByItemAndSearch<T extends ItemLocationRow>(
  rows: Array<T>,
  itemFilter: string,
  searchText: string,
): Array<T> {
  const search = searchText.trim().toLowerCase();
  return rows.filter((row) => {
    if (itemFilter && row.itemName !== itemFilter) {
      return false;
    }
    if (!search) {
      return true;
    }
    return row.itemName.toLowerCase().includes(search) || (row.locationName ?? '').toLowerCase().includes(search);
  });
}

export function distinctItemNames<T extends ItemLocationRow>(rows: Array<T>): Array<string> {
  return Array.from(new Set(rows.map((row) => row.itemName))).sort((a, b) => a.localeCompare(b));
}

/**
 * Pharmaceutical / non-pharmaceutical split, the same rule the Stock Management app's item list
 * uses: a stock item linked to a drug is pharmaceutical, anything else (gloves, syringes, lab
 * consumables) is not. '' means both.
 */
export type ItemType = '' | 'pharma' | 'nonPharma';

export function filterByItemType<T extends { isDrug?: boolean | null }>(rows: Array<T>, itemType: ItemType): Array<T> {
  if (!itemType) {
    return rows;
  }
  const wantDrug = itemType === 'pharma';
  return rows.filter((row) => !!row.isDrug === wantDrug);
}

/**
 * Memoised filterByItemType. The return type is spelled out because this app has no React type
 * definitions, so a bare useMemo would hand back `any` and the row type would be lost downstream.
 */
export function useItemTypeRows<T extends { isDrug?: boolean | null }>(rows: Array<T>, itemType: ItemType): Array<T> {
  return useMemo(() => filterByItemType(rows, itemType), [rows, itemType]);
}
