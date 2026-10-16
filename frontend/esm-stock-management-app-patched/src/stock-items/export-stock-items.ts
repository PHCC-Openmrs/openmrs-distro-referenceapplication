import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { type TFunction } from 'i18next';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';
import { type StockItemQuantityMeta } from './stock-item-quantities.resource';
import { type StockStatus } from './components/stock-items-column-filter/stock-items-column-filter.component';

interface ExportStockItemsOptions {
  items: Array<StockItemDTO>;
  quantityByItem: Map<string, number>;
  quantityMetaByItem: Map<string, StockItemQuantityMeta>;
  getStockStatus: (item: StockItemDTO) => StockStatus;
  locationName?: string;
  t: TFunction;
}

// Mirrors the on-screen table, but over every row that matches the current search/type/column
// filters (not just the visible page), and with quantities split into numeric + unit columns so
// they stay usable for sums and sorting in Excel.
export function downloadStockItemsAsExcel({
  items,
  quantityByItem,
  quantityMetaByItem,
  getStockStatus,
  locationName,
  t,
}: ExportStockItemsOptions) {
  const stockStatusLabels: Record<StockStatus, string> = {
    inStock: t('inStock', 'In stock'),
    understocked: t('understockedItem', 'Understocked'),
    outOfStock: t('outOfStock', 'Out of stock'),
  };

  const headers = [
    t('type', 'Type'),
    t('genericName', 'Generic name'),
    t('commonName', 'Common name'),
    t('tradeName', 'Trade name'),
    t('quantity', 'Quantity'),
    t('quantityUoM', 'Quantity UoM'),
    t('quantityInDispensingUoM', 'Quantity (dispensing UoM)'),
    t('dispensingUnitName', 'Dispensing UoM'),
    t('defaultStockOperationsUoMName', 'Bulk packaging'),
    t('reorderLevel', 'Reorder level'),
    t('reorderLevelUoM', 'Reorder level UoM'),
    t('stockStatus', 'Stock status'),
  ];

  const rows = items.map((item) => {
    const quantity = quantityByItem.get(item.uuid ?? '') ?? 0;
    const meta = quantityMetaByItem.get(item.uuid ?? '');
    return [
      item.drugUuid ? t('drug', 'Drug') : t('other', 'Other'),
      item.drugName ?? item.conceptName ?? '',
      item.commonName ?? '',
      item.drugUuid ? (item.conceptName ?? '') : '',
      quantity,
      meta?.quantityUoM ?? item.dispensingUnitName ?? '',
      quantity * (meta?.quantityFactor ?? 1),
      item.dispensingUnitName ?? '',
      item.defaultStockOperationsUoMName ?? '',
      item.reorderLevel ?? '',
      item.reorderLevel ? (item.reorderLevelUoMName ?? '') : '',
      stockStatusLabels[getStockStatus(item)],
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = headers.map((header, index) => ({
    wch: Math.min(60, Math.max(header.length, ...rows.map((row) => String(row[index] ?? '').length)) + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t('stockItems', 'Stock items').slice(0, 31));

  const locationPart = locationName ? `-${locationName.replace(/[^\p{L}\p{N}]+/gu, '_')}` : '';
  XLSX.writeFile(workbook, `stock-items${locationPart}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
}
