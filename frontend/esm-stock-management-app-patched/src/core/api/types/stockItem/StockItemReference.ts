import { type BaseOpenmrsData } from '../BaseOpenmrsData';
import { type StockSource } from '../stockOperation/StockSource';
import { type StockItem } from './StockItem';

export interface StockItemReference extends BaseOpenmrsData {
  referenceCode: string;
  stockSource: StockSource;
  stockItem: StockItem;
}

export interface StockItemReferenceDTO {
  id?: string;
  uuid?: string;
  stockItemUuid?: string;
  stockSourceName?: string;
  stockSourceUuid?: string;
  referenceCode?: string | null;
  // The pack size this vendor supplies the item in - a specific row from the item's own
  // Packaging Units list (identified by that row's uuid), not a raw concept/quantity, so it
  // always stays consistent with what's defined on the Packaging Units tab.
  packagingUnitUuid?: string | null;
  packagingUnitName?: string;
  packagingUnitFactor?: number;
}
