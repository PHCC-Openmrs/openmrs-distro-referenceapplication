// One unsaved reference row on the References tab. Source and code are required by the backend;
// the pack size (one of the item's Packaging Units) is optional.
export interface StockItemReferenceDraft {
  source: string | null;
  code: string;
  packagingUnit: string | null;
}

export interface StockItemReferenceFormData {
  drafts: StockItemReferenceDraft[];
}
